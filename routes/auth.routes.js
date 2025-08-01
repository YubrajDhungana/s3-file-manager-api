const express = require('express');
const router = express.Router();
const authController = require('../controller/auth.controller');

router.get('/login',authController.loginCheck);

module.exports = router;