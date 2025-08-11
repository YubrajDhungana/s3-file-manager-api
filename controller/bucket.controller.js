const db = require("../configs/db");
const { decrypt} = require("../utils/cryptoUtils");

const listBuckets = async (req, res) => {
  try {
    const accountId = req.params.id;
    const [rows] = await db.query(
      "SELECT id, bucket_alias FROM aws_buckets where account_id=?",
      accountId
    );
    const buckets = rows.map((row) => {
      const decryptedAlias = decrypt(row.bucket_alias);
      return {
        id: row.id,
        bucket_name: decryptedAlias,
      };
    });
    res.status(200).json(buckets);
  } catch (error) {
    console.error("Error fetching buckets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { listBuckets };
