const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require("dotenv").config();
const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION_THIRD,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID_THIRD,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_THIRD,
  },
});

module.exports = {
  s3Client,
};
