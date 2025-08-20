const {
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand
} = require("@aws-sdk/client-s3");
const { getS3ClientByBucketId } = require("../configs/s3");
const db = require("../configs/db");
const path = require("path");
require("dotenv").config();

//another method to upload  file
const uploadFile = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded" });
    }
    const bucketId = req.params.bucketId;

    const { s3Client, bucketConfig } = await getS3ClientByBucketId(bucketId);
    const { bucket_name, aws_bucket_url } = bucketConfig;

    const baseKey = req.body.key || "";
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
  try{
    const bucketId = req.params.bucketId
    const{ key } = req.query
    if(!key){
      res.status(400).json({message:"File key is required"})
    }

    const {s3Client, bucketConfig} = await getS3ClientByBucketId(bucketId);
    const {bucket_name} = bucketConfig;

    const headObject = new HeadObjectCommand({
      Bucket:bucket_name,
      Key:key
    })

    const headResponse = await  s3Client.send(headObject);

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(key)}"`);
    res.setHeader('Content-Type', headResponse.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', headResponse.ContentLength);
    res.setHeader('Last-Modified', headResponse.LastModified.toUTCString());
    res.setHeader('ETag', headResponse.ETag);

    const command = new GetObjectCommand({
      Bucket:bucket_name,
      Key:key
    })

    const response  = await s3Client.send(command);
    response.Body.pipe(res);
  }catch(error){
    console.error("Error downloading file:", error);
    res.status(500).json({message:"Internal server error"});
  }
}

const listFilesByFolder = async (req, res) => {
  try {
    const bucketId = req.params.bucketId;
    const limit = parseInt(req.query.limit) || 10;
    const continuationToken = req.query.continuationToken || null;
    // If no folder is provided, list from the root of the bucket
    const folder = req.query.folder || "";
    const prefix =
      folder === "" || folder.endsWith("/") ? folder : folder + "/";

    const { s3Client, bucketConfig } = await getS3ClientByBucketId(bucketId);
    const { bucket_name, aws_bucket_url } = bucketConfig;

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
      path: prefix,
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
  const bucketId = req.params.bucketId;
  const filePaths = req.body.filePaths;
  if (!filePaths || filePaths.length === 0) {
    return res.status(400).json({ message: "No file selected" });
  }

  const { s3Client, bucketConfig } = await getS3ClientByBucketId(bucketId);
  const { bucket_name } = bucketConfig;

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
  const bucketId = req.params.bucketId;
  const { oldKey, newKey } = req.body;
  try {
    const { s3Client, bucketConfig } = await getS3ClientByBucketId(bucketId);
    const { bucket_name } = bucketConfig;

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
      .json({ message: "Error renaming file: " + error.message });
  }
};

const searchFiles = async (req, res) => {
  try {
    const bucketId = req.params.bucketId;
    const folder = req.query.folder || "";
    const searchTerm = (req.query.search || "").toLowerCase();
    const prefix =
      folder === "" || folder.endsWith("/") ? folder : folder + "/";
    let continuationToken = null;
    let matchedFiles = [];

    const { s3Client, bucketConfig } = await getS3ClientByBucketId(bucketId);
    const { bucket_name, aws_bucket_url } = bucketConfig;

    // Paginate through all files recursively
    do {
      const command = new ListObjectsV2Command({
        Bucket: bucket_name,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      });

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
  downloadFile
};
