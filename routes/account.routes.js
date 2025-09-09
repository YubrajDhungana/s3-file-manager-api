const express = require("express");
const router = express.Router();
const accountController = require("../controller/account.controller");
const authMiddleware = require("../middleware/auth.middleware");

router.get("/", authMiddleware, accountController.getAccounts);
router.post("/add-user", authMiddleware, accountController.addUser);
router.delete("/delete-user/:userId", authMiddleware, accountController.deleteUser);
module.exports = router;
