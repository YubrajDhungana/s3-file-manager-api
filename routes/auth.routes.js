const express = require("express");
const router = express.Router();
const authController = require("../controller/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const { authLimiter } = require("../middleware/limiter");

router.use(authLimiter);

router.post("/login", authController.loginCheck);
router.get("/check-auth", authMiddleware, authController.authcheck);
router.post("/logout", authController.logout);

module.exports = router;
