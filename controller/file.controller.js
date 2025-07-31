const File = require("../models/files");
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getS3ClientByBucketId } = require("../configs/s3");
const db = require("../configs/db");
require("dotenv").config();
// const getFileURL = async (req, res) => {
//   const key = req.body.key;
//   if (!key) {
//     return res.status(400).json({ message: "Key is required" });
//   }
//   try {
//     const url = await getObjectURL(key);
//     res.status(200).json({ url: url });
//   } catch (error) {
//     res.status(500).json({ message: "error geting url" + error.message });
//   }
// };

//getting file upload url
// const uploadFile = async (req, res) => {
//   try {
//     if (!req.files || req.files.length === 0) {
//       return res.status(400).json({ message: "No files were upload" });
//     }

//     const result = await Promise.all(
//       req.files.map(async (file) => {
//         const filename = file.originalname;
//         const contentType = file.mimetype;

//         const uploadURL = await putObject(filename, contentType);
//         if (!uploadURL) {
//           throw new Error("Error getting upload URL");
//         }
//         return {
//           filename: filename,
//           url: uploadURL,
//         };
//       })
//     );
//     res.status(200).json({ uploads: result });
//   } catch (error) {
//     console.log("Error uploading files:", error.message);
//     res.status(500).json({ message: error.message });
//   }
// };

//another method to upload  file
const uploadFile = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files were uploaded" });
    }
    const bucketId = req.params.bucketId

    const {s3Client,bucketConfig} = await getS3ClientByBucketId(bucketId);
    const {bucket_name,aws_bucket_url} = bucketConfig;


    const baseKey = req.body.key || '';
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

//list folders
const listFolders = async (req, res) => {
  const prefix = req.query.prefix || "";
  try {
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_THIRD,
      Prefix: prefix,
      Delimiter: "/",
    });
    const response = await s3Client.send(command);
    const folders = response.CommonPrefixes?.map((cp) => cp.Prefix) || [];
    res.status(200).json({ folders });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Error listing folders: " + error.message });
  }
};
// const listFilesByFolder = async (req, res) => {
//   const limit = parseInt(req.query.limit) || 10;
//   const continuationToken = req.query.continuationToken || null;
//   const folder = req.query.folder || "/s3-filemanager/";
//   try {
//     const command = new ListObjectsV2Command({
//       Bucket: process.env.AWS_BUCKET_THIRD,
//       Prefix: folder.endsWith("/") ? folder : folder + "/",
//       Delimiter: "/",
//       MaxKeys: limit,
//       ContinuationToken: continuationToken,
//     });

//     const response = await s3Client.send(command);
//     const result = {
//       files: [],
//       isTruncated: response.IsTruncated,
//       nextContinuationToken: response.NextContinuationToken || null,
//       keyCount: response.KeyCount,
//     };
//     if (response.Contents && response.Contents.length > 0) {
//       result.files = response.Contents.map((file) => ({
//         key: file.Key,
//         lastModified: file.LastModified,
//         size: file.Size,
//         type: file.ContentType,
//         url: `${process.env.AWS_URL_THIRD}/${file.Key}`,
//       }));
//     }

//     res.status(200).json({ files: result });
//   } catch (error) {
//     res
//       .status(500)
//       .json({ message: "Error listing/searching files: " + error.message });
//   }
// };

// const listFilesByFolder = async (req, res) => {
//   try {
//     const folder = req.query.folder || ""; // root if not provided
//     const prefix =
//       folder.endsWith("/") || folder === "" ? folder : folder + "/";

//     const command = new ListObjectsV2Command({
//       Bucket: process.env.AWS_BUCKET_THIRD,
//       Prefix: prefix,
//       Delimiter: "/", // tells S3 to give subfolder names in CommonPrefixes
//     });

//     const response = await s3Client.send(command);

//     // List of folders (subfolders inside current folder)
//     const folders = (response.CommonPrefixes || []).map((cp) => ({
//       name: cp.Prefix.replace(prefix, "").replace(/\/$/, ""),
//       type: "folder",
//       key: cp.Prefix,
//     }));

//     // List of files (direct children only)
//     const files = (response.Contents || [])
//       .filter((file) => file.Key !== prefix) // skip the folder placeholder itself
//       .map((file) => ({
//         name: file.Key.replace(prefix, ""),
//         key: file.Key,
//         lastModified: file.LastModified,
//         size: file.Size,
//         type: "file",
//         url: `${process.env.AWS_URL_THIRD}/${file.Key}`,
//       }));

//     const result = [...folders, ...files]; // Combine folders and files

//     res.status(200).json({ path: prefix, items: result });
//   } catch (error) {
//     console.error("Error listing files/folders:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };

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
      Delimiter: "/", // Important to separate folders
      MaxKeys: limit,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    console.log(response);

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

    const {s3Client,bucketConfig} = await getS3ClientByBucketId(bucketId);
    const {bucket_name} = bucketConfig;

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
        Prefix: prefix, // Recursive search inside this folder
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
  listFolders,
  searchFiles,
};
