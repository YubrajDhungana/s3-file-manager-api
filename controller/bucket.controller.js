const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");

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

      console.log("admin accessible buckets", buckets);

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

module.exports = { listBuckets };
