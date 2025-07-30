const express = require('express');
const router = express.Router();
const bucketController = require('../controller/bucket.controller');

router.get('/list-buckets',bucketController.listBuckets);
module.exports = router;