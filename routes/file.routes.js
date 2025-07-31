const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const fileController = require("../controller/file.controller");
const upload = multer();

//router.get("/list-folders", fileController.listFolders);
router.get("/:bucketId/search-files", fileController.searchFiles);
router.get("/:bucketId/listByFolder", fileController.listFilesByFolder);
router.patch("/:bucketId/rename", fileController.renameFile);
router.post(
  "/:bucketId/upload",
  upload.array("files"),
  fileController.uploadFile
);
router.delete("/:bucketId", fileController.deleteFile);

module.exports = router;
