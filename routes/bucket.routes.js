const express = require('express');
const router = express.Router();
const bucketController = require('../controller/bucket.controller');
const authMiddleware  = require('../middleware/auth.middleware');

router.get('/:id/list-buckets',authMiddleware,bucketController.listBuckets);
router.get('/:id/s3-buckets',authMiddleware,bucketController.listBucketsFromS3);
module.exports = router;