const express = require("express");
const router = express.Router();
const accountController = require("../controller/account.controller");

router.get("/", accountController.getAccounts);
module.exports = router;
