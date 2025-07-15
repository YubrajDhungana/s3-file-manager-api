const express = require('express');
const router = express.Router();
const bucketController = require('../controller/bucket.controller');

router.get('/:accountId',bucketController.getBucketsById);
module.exports = router;