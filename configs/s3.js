const { S3Client } = require("@aws-sdk/client-s3");
const db = require("./db");
const { encrypt, decrypt } = require("../utils/cryptoUtils");
require("dotenv").config();
const getS3ClientByBucketId = async (bucketId) => {
  if (!bucketId) {
    throw new Error("Bucket ID is required");
  }

  try {
    const [rows] = await db.query(
      "SELECT account_id,bucket_alias,aws_bucket_url FROM aws_buckets WHERE id = ?",
      [bucketId]
    );
    if (!rows || rows.length === 0) {
      throw new Error(`Bucket with ID ${bucketId} not found`);
    }

    const [rows1] = await db.query(
      "SELECT access_key_id,secret_access_key, region FROM aws_accounts WHERE id = ?",
      [rows[0].account_id]
    );
    if (!rows1 || rows1.length === 0) {
      throw new Error(`Account with ID ${rows[0].account_id} not found`);
    }

    const access_key_id = decrypt(rows1[0].access_key_id);
    const secret_access_key = decrypt(rows1[0].secret_access_key);
    const region = decrypt(rows1[0].region);
    const bucket_name = decrypt(rows[0].bucket_alias);
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
      account_id: bucketData.account_id,
      bucket_alias: encrypt(bucketData.bucket_alias),
      aws_bucket_url: encrypt(bucketData.aws_bucket_url),
    };

    const [result] = await db.query(
      "INSERT INTO aws_buckets SET ?",
      encryptedData
    );
    return result.insertId;
  } catch (error) {
    console.error("Save Bucket Error:", error);
    throw error;
  }
};

const saveAccountcredentials = async (accountData) => {
  try {
    console.log(accountData);
    const encryptedData = {
      account_name: encrypt(accountData.account_name),
      access_key_id: encrypt(accountData.access_key_id),
      secret_access_key: encrypt(accountData.secret_access_key),
      region: encrypt(accountData.region),
    };
    const [result] = await db.query(
      "INSERT INTO aws_accounts SET ?",
      encryptedData
    );
    return result.insertId;
  } catch (error) {
    console.error("Error saving account credentials", error);
    throw error;
  }
};

module.exports = {
  getS3ClientByBucketId,
  saveBucketCredentials,
  saveAccountcredentials,
};
