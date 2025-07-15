const File = require("../models/files");
const path = require ('path');
const fs = require('fs');
const getFilesByBucket = async (req, res) => {
  try {
    const bucketId = req.params.bucketId;
    const files = await File.find({ bucketId: bucketId });
    if (!files || files.length === 0) {
      return res
        .status(404)
        .json({ message: "No files found for this bucket" });
    }
    res.status(200).json({ files: files });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadFile = async (req, res)=>{
    try{
        if(!req.file){
            return res.status(400).json({message:"No files were upload"});
        }
        const {bucketId} = req.body;

        const newFile = new File({
            name:req.file.originalname,
            size:req.file.size,
            type:path.extname(req.file.originalname).substring(1),
            bucketId,
            path:req.file.path,
            lastModified:new Date()
        })
        await newFile.save();
        res.status(201).json({message:"File uploaded successfully",file:newFile});
    }catch(error){
        res.status(500).json({ message: error.message });
    }
}

const deleteFile = async (req,res) =>{
    try{
        const fileId= req.params.id;
        const file = await File.find({_id:fileId});
        if(!file){
            return res.status(404).json({message:"File not found"});
        }

        //delete file from the system
        fs.unlinkSync(file.path);
        
        //delete file from the database
        await File.findByIdAndDelete(fileId);
        res.status(200).json({message:"File deleted successfully"});

    }catch(error){
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    getFilesByBucket,
    uploadFile,
    deleteFile
}