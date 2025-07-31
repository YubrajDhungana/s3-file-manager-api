const { S3Client } = require("@aws-sdk/client-s3");
const db = require("./db");
const { encrypt, decrypt } = require("../utils/cryptoUtils");
const getS3ClientByBucketId = async (bucketId) => {
  if (!bucketId) {
    throw new Error("Bucket ID is required");
  }

  try {
    const [rows] = await db.query("SELECT * FROM buckets WHERE id = ?", [
      bucketId,
    ]);
    if (!rows || rows.length === 0) {
      throw new Error(`Bucket with ID ${bucketId} not found`);
    }

    const access_key_id = decrypt(rows[0].access_key_id);
    const secret_access_key = decrypt(rows[0].secret_access_key);
    const region = rows[0].region;
    const bucket_name = decrypt(rows[0].bucket_name);
    const aws_bucket_url = decrypt(rows[0].aws_bucket_url);

    if (!access_key_id || !secret_access_key || !region || !bucket_name) {
      throw new Error(
        "Missing required AWS credentials or configuration in database"
      );
    }

    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: access_key_id,
        secretAccessKey: secret_access_key,
      },
    });

    return {
      s3Client,
      bucketConfig: {
        bucket_name,
        aws_bucket_url,
      },
    };
  } catch (error) {
    console.error("Failed to create S3 client from bucket ID:", error);
    throw error;
  }
};

const saveBucketCredentials = async (bucketData) => {
  try {
    const encryptedData = {
      access_key_id: encrypt(bucketData.access_key_id),
      secret_access_key: encrypt(bucketData.secret_access_key),
      region: bucketData.region,
      bucket_name: encrypt(bucketData.bucket_name),
      aws_bucket_url: encrypt(bucketData.aws_bucket_url),
    };

    const [result] = await db.query("INSERT INTO buckets SET ?", encryptedData);
    return result.insertId;
  } catch (error) {
    console.error("Save Bucket Error:", error);
    throw error;
  }
};

module.exports = {
  getS3ClientByBucketId,
  saveBucketCredentials,
};
