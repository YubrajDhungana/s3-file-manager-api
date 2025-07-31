const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");

const listBuckets = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, bucket_name FROM buckets");
    const buckets = rows.map(row=>({
      id:row.id,
      bucket_name:decrypt(row.bucket_name)
    }))
    res.status(200).json(buckets);
  } catch (error) {
    console.error("Error fetching buckets:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { listBuckets };
