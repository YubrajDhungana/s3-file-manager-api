const {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getS3Client } = require("../configs/s3");
const db = require("../configs/db");
const path = require("path");
require("dotenv").config();

//another method to upload  file
const uploadFile = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded" });
    }
    const userId = req.user.id;
    const bucket_name = req.body.bucketName;
    const accountId = req.params.accountId;

    //check if user has access to this bucket or not
    const [row] = await db.query(
      "SELECT r.id AS role_id, r.name AS role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?",
      [userId]
    );

    if (row.length > 0 && row[0].role_name.toLowerCase() !== "admin") {
      const [bucket] = await db.query(
        "SELECT * FROM role_buckets WHERE role_id= ? AND bucket_name=?",
        [row[0].role_id, bucket_name]
      );

      if (bucket.length === 0) {
        return res
          .status(403)
          .json({ message: "You don't have access to this bucket" });
      }
    }

    const { s3Client, region } = await getS3Client(accountId);

    const baseKey = req.body.key || "";
    const aws_bucket_url = `https://${bucket_name}.s3.${region}.amazonaws.com`;
    const uploadFiles = await Promise.all(
      req.files.map(async (file) => {
        const key = `${baseKey}${file.originalname}`;
        const params = {
          Bucket: bucket_name,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };
        await s3Client.send(new PutObjectCommand(params));
        return {
          name: file.originalname,
          location: `${aws_bucket_url}/${key}`,
          size: file.size,
          contentType: file.mimetype,
        };
      })
    );

    res.status(200).json({
      message: "Files uploaded successfully",
      files: uploadFiles,
    });
  } catch (error) {
    res.status(500).json({ message: "Error uploading file: " + error.message });
  }
};

const downloadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const bucket_name = req.query.bucketName;
    const accountId = req.params.accountId;
    const { key } = req.query;

    if (!key) {
      res.status(400).json({ message: "File key is required" });
    }

    //check if user has access to the bucket or not
    const [row] = await db.query(
      "SELECT r.id AS role_id, r.name AS role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?",
      [userId]
    );

    if (row.length > 0 && row[0].role_name.toLowerCase() !== "admin") {
      const [bucket] = await db.query(
        "SELECT * FROM role_buckets WHERE role_id= ? AND bucket_name=?",
        [row[0].role_id, bucket_name]
      );

      if (bucket.length === 0) {
        return res
          .status(403)
          .json({ message: "You don't have access to this bucket" });
      }
    }
    const { s3Client } = await getS3Client(accountId);

    const headObject = new HeadObjectCommand({
      Bucket: bucket_name,
      Key: key,
    });

    const headResponse = await s3Client.send(headObject);

    // Set appropriate headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(key)}"`
    );
    res.setHeader(
      "Content-Type",
      headResponse.ContentType || "application/octet-stream"
    );
    res.setHeader("Content-Length", headResponse.ContentLength);
    res.setHeader("Last-Modified", headResponse.LastModified.toUTCString());
    res.setHeader("ETag", headResponse.ETag);

    const command = new GetObjectCommand({
      Bucket: bucket_name,
      Key: key,
    });

    const response = await s3Client.send(command);
    response.Body.pipe(res);
  } catch (error) {
    console.error("Error downloading file:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const listFilesByFolder = async (req, res) => {
  try {
    const userId = req.user.id;
    const bucket_name = req.query.bucketName;
    const accountId = req.params.accountId;
    const limit = parseInt(req.query.limit) || 10;
    const continuationToken = req.query.continuationToken || null;

    //check if user has access to this bucket or not
    const [row] = await db.query(
      "SELECT r.id AS role_id, r.name AS role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?",
      [userId]
    );

    if (row.length > 0 && row[0].role_name.toLowerCase() !== "admin") {
      const [bucket] = await db.query(
        "SELECT * FROM role_buckets WHERE role_id= ? AND bucket_name=?",
        [row[0].role_id, bucket_name]
      );

      if (bucket.length === 0) {
        return res
          .status(403)
          .json({ message: "You don't have access to this bucket" });
      }
    }

    // If no folder is provided, list from the root of the bucket
    const folder = req.query.folder || "";
    const prefix =
      folder === "" || folder.endsWith("/") ? folder : folder + "/";

    // const { s3Client,region} = await getS3ClientByBucketId(bucketId);
    const { s3Client, region } = await getS3Client(accountId);

    const command = new ListObjectsV2Command({
      Bucket: bucket_name,
      Prefix: prefix,
      Delimiter: "/", // separate folders
      MaxKeys: limit,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    // Folders inside the current folder
    const folders = (response.CommonPrefixes || []).map((cp) => {
      const folderName = cp.Prefix.replace(prefix, "").replace(/\/$/, "");
      return {
        name: folderName === "" ? "/" : folderName,
        key: cp.Prefix,
        type: "folder",
      };
    });

    const aws_bucket_url = `https://${bucket_name}.s3.${region}.amazonaws.com`;

    // Files directly inside the current folder
    const files = (response.Contents || [])
      .filter((file) => file.Key !== prefix)
      .map((file) => ({
        name: file.Key.replace(prefix, ""),
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        type: "file",
        url: `${aws_bucket_url}/${file.Key}`,
      }));
    res.status(200).json({
      items: [...folders, ...files],
      isTruncated: response.IsTruncated,
      nextContinuationToken: response.NextContinuationToken || null,
      keyCount: response.KeyCount,
    });
  } catch (error) {
    console.error("Error listing files/folders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
const deleteFile = async (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.accountId;
  const bucket_name = req.body.bucketName;
  const filePaths = req.body.filePaths;
  if (!filePaths || filePaths.length === 0) {
    return res.status(400).json({ message: "No file selected" });
  }

  //check if user has access to this bucket or not
  const [row] = await db.query(
    "SELECT r.id AS role_id, r.name AS role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?",
    [userId]
  );

  if (row.length > 0 && row[0].role_name.toLowerCase() !== "admin") {
    const [bucket] = await db.query(
      "SELECT * FROM role_buckets WHERE role_id= ? AND bucket_name=?",
      [row[0].role_id, bucket_name]
    );

    if (bucket.length === 0) {
      return res
        .status(403)
        .json({ message: "You don't have access to this bucket" });
    }
  }

  const { s3Client } = await getS3Client(accountId);

  try {
    const params = {
      Bucket: bucket_name,
      Delete: {
        Objects: filePaths.map((key) => ({ Key: key })),
      },
    };

    await s3Client.send(new DeleteObjectsCommand(params));
    res.status(200).json({ message: "Files deleted successfully" });
  } catch (error) {
    console.error("Error deleting files:", error);
    return res
      .status(500)
      .json({ message: "Error deleting files: " + error.message });
  }
};

const renameFile = async (req, res) => {
  const userId = req.user.id;
  const accountId = req.params.accountId;
  const { oldKey, newKey, bucketName } = req.body;
  const bucket_name = bucketName;
  try {
    //check if user has access to this bucket or not
    const [row] = await db.query(
      "SELECT r.id AS role_id, r.name AS role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?",
      [userId]
    );

    if (row.length > 0 && row[0].role_name.toLowerCase() !== "admin") {
      const [bucket] = await db.query(
        "SELECT * FROM role_buckets WHERE role_id= ? AND bucket_name=?",
        [row[0].role_id, bucket_name]
      );

      if (bucket.length === 0) {
        return res
          .status(403)
          .json({ message: "You don't have access to this bucket" });
      }
    }

    const { s3Client } = await getS3Client(accountId);

    const params = {
      Bucket: bucket_name,
      CopySource: `${bucket_name}/${oldKey}`,
      Key: newKey,
    };

    const deleteParam = {
      Bucket: bucket_name,
      Key: oldKey,
    };
    await s3Client.send(new CopyObjectCommand(params));
    await s3Client.send(new DeleteObjectCommand(deleteParam));
    res
      .status(200)
      .json({ message: "File renamed successfully", newKey: newKey });
  } catch (error) {
    console.error("Error renaming file:", error);
    return res
      .status(500)
      .json({ message: "Error renaming file"});
  }
};

const searchFiles = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.accountId;
    const bucket_name = req.query.bucketName;
    const folder = req.query.folder || "";
    const searchTerm = (req.query.search || "").toLowerCase();
    const prefix =
      folder === "" || folder.endsWith("/") ? folder : folder + "/";
    let continuationToken = null;
    let matchedFiles = [];

    //check if user has access to this bucket or not
    const [row] = await db.query(
      "SELECT r.id AS role_id, r.name AS role_name FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = ?",
      [userId]
    );

    if (row.length > 0 && row[0].role_name.toLowerCase() !== "admin") {
      const [bucket] = await db.query(
        "SELECT * FROM role_buckets WHERE role_id= ? AND bucket_name=?",
        [row[0].role_id, bucket_name]
      );

      if (bucket.length === 0) {
        return res
          .status(403)
          .json({ message: "You don't have access to this bucket" });
      }
    }

    const { s3Client, region } = await getS3Client(accountId);

    // Paginate through all files recursively
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket_name,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });
      const aws_bucket_url = `https://${bucket_name}.s3.${region}.amazonaws.com`;
      const response = await s3Client.send(command);
      const files = (response.Contents || [])
        .filter((file) => file.Key !== prefix)
        .filter((file) => {
          const fileName = file.Key.split("/").pop();
          return fileName.toLowerCase().includes(searchTerm);
        })
        .map((file) => ({
          name: file.Key.replace(prefix, ""),
          key: file.Key,
          size: file.Size,
          lastModified: file.LastModified,
          type: "file",
          url: `${aws_bucket_url}/${file.Key}`,
        }));
      matchedFiles = [...matchedFiles, ...files];
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : null;
    } while (continuationToken); // Continue until all matching files are fetched

    res.status(200).json({
      path: prefix,
      items: matchedFiles,
      isTruncated: false,
      nextContinuationToken: null,
      keyCount: matchedFiles.length,
    });
  } catch (error) {
    console.error("Error searching files:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  uploadFile,
  deleteFile,
  listFilesByFolder,
  renameFile,
  searchFiles,
  downloadFile,
};
