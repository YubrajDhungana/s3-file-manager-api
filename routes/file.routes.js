const express = require("express");
const router = express.Router();
const fileController = require("../controller/file.controller");

router.get("/:bucketId", fileController.getFilesByBucket);
router.post("/upload", fileController.uploadFile);
router.delete("/:id", fileController.deleteFile);

module.exports = router;
