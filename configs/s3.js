const { S3Client } = require("@aws-sdk/client-s3");
const db = require("./db");
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
    const {
      access_key_id,
      secret_access_key,
      region,
      bucket_name,
      aws_bucket_url,
    } = rows[0];

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

module.exports = {
  getS3ClientByBucketId
};
