const express = require("express");
const router = express.Router();
const multer = require("multer");
const authMiddleware = require("../middleware/auth.middleware");
const fileController = require("../controller/file.controller");
const upload = multer();

//router.get("/list-folders", fileController.listFolders);
router.get(
  "/:accountId/search-files",
  authMiddleware,
  fileController.searchFiles
);
router.get(
  "/:accountId/listByFolder",
  authMiddleware,
  fileController.listFilesByFolder
);
router.patch("/:accountId/rename", authMiddleware, fileController.renameFile);
router.post(
  "/:accountId/upload",
  upload.array("files"),
  authMiddleware,
  fileController.uploadFile
);
router.delete("/:accountId", authMiddleware, fileController.deleteFile);
router.get("/:accountId/download", authMiddleware, fileController.downloadFile);
module.exports = router;
