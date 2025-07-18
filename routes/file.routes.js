const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fileController = require("../controller/file.controller");

//creating directory if it does not exist
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, nameWithoutExt + "_" + uniqueSuffix + ext);
  },
});

const upload = multer({ storage });

router.get("/", fileController.getFilesByBucket);
router.post("/upload", upload.array("files"), fileController.uploadFile);
router.delete("/:id", fileController.deleteFile);

module.exports = router;
