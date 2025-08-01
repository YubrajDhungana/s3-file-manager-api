const express = require('express');
const router = express.Router();
const bucketController = require('../controller/bucket.controller');
const authMiddleware  = require('../middleware/auth.middleware');

router.get('/list-buckets',authMiddleware,bucketController.listBuckets);
module.exports = router;