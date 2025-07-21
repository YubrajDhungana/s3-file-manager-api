const File = require("../models/files");
const {S3Client, ListObjectsV2Command} = require("@aws-sdk/client-s3");
const { getObjectURL, putObject, listFiles } = require("../configs/s3");
const path = require("path");
const fs = require("fs");
require("dotenv").config();
const getFilesByBucket = async (req, res) => {
  // try {
  //   const bucketId = req.params.bucketId;
  //   const files = await File.find({ bucketId: bucketId });
  //   if (!files || files.length === 0) {
  //     return res
  //       .status(404)
  //       .json({ message: "No files found for this bucket" });
  //   }
  //   res.status(200).json({ files: files });
  // } catch (error) {
  //   res.status(500).json({ message: error.message });
  // }
    try{
      const result = await listFiles();
      if (result && result.length > 0) {
        console.log("Files in bucket:", result);
          //res.status(200).json({files: result});
        }else {
          res.status(404).json({message:"No files found in bucket"});
        }

    }catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  
};

const getFileURL = async (req,res) => {
  const key = req.body.key;
  if (!key) {
    return res.status(400).json({ message: "Key is required" });
  }
  console.log("key ",key);
  try {
    const url  = await getObjectURL(key);
    res.status(200).json({url:url});
  }catch(error){
    res.status(500).json({ message: "error geting url"+ error.message });
  }
}

const uploadFile = async (req, res) => {
  try {
    if (!req.files) {
      return res.status(400).json({ message: "No files were upload" });
    }
    const { bucketId } = req.body;

    const savedFiles = await Promise.all(
      req.files.map((file) => {
        const newFile = new File({
          name: file.originalname,
          size: file.size,
          type: path.extname(file.originalname).substring(1),
          bucketId,
          path: file.path,
          lastModified: new Date(),
        });
        return newFile.save();
      })
    );
    res
      .status(201)
      .json({ message: "File uploaded successfully", file: savedFiles });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    //delete file from the system
    fs.unlinkSync(file.path);

    //delete file from the database
    await File.findByIdAndDelete(fileId);
    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getFilesByBucket,
  uploadFile,
  deleteFile,
  getFileURL
};
