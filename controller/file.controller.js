const File = require("../models/files");
const {S3Client, ListObjectsV2Command} = require("@aws-sdk/client-s3");
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

  const s3Client = new S3Client({
    region:process.env.AWS_DEFAULT_REGION_THIRD,
    credentials:{
      accessKeyId: process.env.AWS_ACCESS_KEY_ID_THIRD,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_THIRD
    }
  })

    const bucketName = process.env.AWS_BUCKET_THIRD;
   
    try{
      const command = new ListObjectsV2Command({Bucket: bucketName});
      const response = await s3Client.send(command);
      if (response.Contents){
           res.status(200).json({files: response.Contents});
        }else {
          res.status(404).json({message:"No files found in bucket"});
        }

    }catch (error) {
      console.error("Error listing files:", error);
      throw error;
    }
  
};

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
};
