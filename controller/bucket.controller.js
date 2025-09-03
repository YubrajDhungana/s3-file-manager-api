const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

const listBucketsFromS3 = async (req, res) => {
  const accountId = req.params.id;
  try {
    const [rows] = await db.query(
      "SELECT access_key_id,secret_access_key, region FROM aws_accounts WHERE id = ?",
      [accountId]
    );
    if (!rows || rows.length === 0) {
      return res
        .status(404)
        .json({ message: `Account with ID ${accountId} not found` });
    }
    const access_key_id = decrypt(rows[0].access_key_id);
    const secret_access_key = decrypt(rows[0].secret_access_key);
    const region = decrypt(rows[0].region);

    const s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: access_key_id,
        secretAccessKey: secret_access_key,
      },
    });

    const data = await s3Client.send(new ListBucketsCommand({}));
    res.status(200).json(data.Buckets);
  } catch (error) {
    console.error("Error listing buckets", err);
    res.status(500).json({ error: "Failed to list buckets" });
  }
};

const listBuckets = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    const [roleId] = await db.query(
      "SELECT role_id FROM user_roles WHERE user_id = ?",
      [userId]
    );

    const [user] = await db.query("SELECT user_type FROM user WHERE id=?", [
      userId,
    ]);
    if (roleId.length === 0 && user[0].user_type.toLowerCase() === "user") {
      return res
        .status(403)
        .json({ message: "Unauthorized: No roles assigned" });
    }
    //check if it is admin
    let result = [];
    if (user[0].user_type !== "superadmin") {
      [result] = await db.query("SELECT name FROM roles where id=?", [
        roleId[0].role_id,
      ]);
    }
    if (
      (result.length > 0 && result[0].name.toLowerCase() === "admin") ||
      user[0].user_type.toLowerCase() === "superadmin"
    ) {
      const [rows] = await db.query(
        "SELECT access_key_id,secret_access_key, region FROM aws_accounts WHERE id = ?",
        [accountId]
      );
      if (!rows || rows.length === 0) {
        return res
          .status(404)
          .json({ message: `Account with ID ${accountId} not found` });
      }

      const access_key_id = decrypt(rows[0].access_key_id);
      const secret_access_key = decrypt(rows[0].secret_access_key);
      const region = decrypt(rows[0].region);

      const s3Client = new S3Client({
        region: region,
        credentials: {
          accessKeyId: access_key_id,
          secretAccessKey: secret_access_key,
        },
      });

      const data = await s3Client.send(new ListBucketsCommand({}));
      const buckets = data.Buckets.map((bucket) => ({
        bucket_name: bucket.Name,
      }));
      return res.status(200).json(buckets);
    }

    const [buckets] = await db.query(
      "SELECT bucket_name FROM role_buckets where role_id=? AND account_id=?",
      [roleId[0].role_id, accountId]
    );

    if (buckets.length === 0) {
      return res.status(403).json({
        message: "No buckets accessible for your roles",
      });
    }
    res.status(200).json(buckets);
  } catch (error) {
    console.error("Error fetching buckets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { listBuckets, listBucketsFromS3 };
