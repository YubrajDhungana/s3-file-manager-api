const File = require("../models/files");
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { s3Client } = require("../configs/s3");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const getFilesByBucket = async (req, res) => {
  //get files list from s3 bucket
  try {
    const limit = parseInt(req.query.limit) || 10;
    const continuationToken = req.query.continuationToken || null;

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_THIRD,
      MaxKeys: limit,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    const result = {
      files: [],
      isTruncated: response.IsTruncated,
      nextContinuationToken: response.NextContinuationToken || null,
      keyCount: response.KeyCount,
    };

    if (response.Contents && response.Contents.length > 0) {
      result.files = response.Contents.map((file) => ({
        key: file.Key,
        lastModified: file.LastModified,
        size: file.Size,
        type: file.ContentType,
        url: `${process.env.AWS_URL_THIRD}/${file.Key}`,
      }));
      res.status(200).json({ files: result });
    } else {
      res.status(404).json({ message: "No files found in bucket" });
    }
  } catch (error) {
    console.error("Error listing files:", error);
    throw error;
  }
};

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

    const baseKey = req.body.key || "/s3-filemanager/";
    const uploadFiles = await Promise.all(
      req.files.map(async (file) => {
        const key = `${baseKey}${file.originalname}`;
        const bucket = process.env.AWS_BUCKET_THIRD;
        const params = {
          Bucket: bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        };

        await s3Client.send(new PutObjectCommand(params));
        return {
          name: file.originalname,
          location: `https://${bucket}.s3.amazonaws.com/${key}`,
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

//list files by folers
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
    const limit = parseInt(req.query.limit) || 10;
    const continuationToken = req.query.continuationToken || null;
    // If no folder is provided, list from the root of the bucket
    const folder = req.query.folder || "";
    const prefix =
      folder === "" || folder.endsWith("/") ? folder : folder + "/";

    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_BUCKET_THIRD,
      Prefix: prefix,
      Delimiter: "/", // Important to separate folders
      MaxKeys: limit,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);

    // Folders inside the current folder
    const folders = (response.CommonPrefixes || []).map((cp) => ({
      name: cp.Prefix.replace(prefix, "").replace(/\/$/, ""),
      key: cp.Prefix,
      type: "folder",
    }));

    // Files directly inside the current folder
    const files = (response.Contents || [])
      .filter((file) => file.Key !== prefix) // skip the folder object itself
      .map((file) => ({
        name: file.Key.replace(prefix, ""),
        key: file.Key,
        size: file.Size,
        lastModified: file.LastModified,
        type: "file",
        url: `${process.env.AWS_URL_THIRD}/${file.Key}`,
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
  const filePaths = req.body.filePaths;
  if (!filePaths || filePaths.length === 0) {
    return res.status(400).json({ message: "No file selected" });
  }
  try {
    const params = {
      Bucket: process.env.AWS_BUCKET_THIRD,
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
  const { oldKey, newKey } = req.body;
  const bucketName = process.env.AWS_BUCKET_THIRD;
  try {
    const params = {
      Bucket: bucketName,
      CopySource: `${bucketName}/${oldKey}`,
      Key: newKey,
    };

    const deleteParam = {
      Bucket: bucketName,
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

module.exports = {
  getFilesByBucket,
  uploadFile,
  deleteFile,
  listFilesByFolder,
  renameFile,
  listFolders,
};
