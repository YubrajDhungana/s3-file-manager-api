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

    if (roleId.length === 0) {
      return res
        .status(403)
        .json({ message: "Unauthorized: No roles assigned" });
    }
    //check if it is admin
    const [result] = await db.query("SELECT name FROM roles where id=?", [
      roleId[0].role_id,
    ]);
    if (result.length > 0 && result[0].name.toLowerCase() === "admin") {
      const [adminBuckets] = await db.query(
        `SELECT id, bucket_alias FROM aws_buckets  WHERE account_id=?`,
        [accountId]
      );

      const buckets = adminBuckets.map((row) => ({
        id: row.id,
        bucket_name: decrypt(row.bucket_alias),
      }));

      return res.status(200).json(buckets);
    }

    const [rows] = await db.query(
      `SELECT b.id, b.bucket_alias FROM aws_buckets b WHERE b.account_id=? AND b.id in (SELECT rb.bucket_id FROM role_buckets rb WHERE rb.role_id=?)`,
      [accountId, roleId[0].role_id]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        message: "Unauthorized: No buckets accessible for your roles",
      });
    }

    const buckets = rows.map((row) => ({
      id: row.id,
      bucket_name: decrypt(row.bucket_alias),
    }));

    console.log("Accessible buckets:", buckets);

    res.status(200).json(buckets);
  } catch (error) {
    console.error("Error fetching buckets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { listBuckets,listBucketsFromS3 };
