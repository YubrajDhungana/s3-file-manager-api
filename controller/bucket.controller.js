const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");

const listBuckets = async (req, res) => {
  try {
    const userId = req.user.id;
    const accountId = req.params.id;

    const [userRoles] = await db.query(
      "SELECT role_id FROM user_roles WHERE user_id = ?",
      [userId]
    );

    if (userRoles.length === 0) {
      return res
        .status(403)
        .json({ message: "Unauthorized: No roles assigned" });
    }

    const roleIds = userRoles.map((r) => r.role_id);
    //check if it is admin



    

    const [rows] = await db.query(
      `SELECT DISTINCT b.id, b.bucket_alias
       FROM aws_buckets b
       JOIN role_buckets rb ON b.id = rb.bucket_id
       WHERE b.account_id = ? AND rb.role_id IN (?)`,
      [accountId, roleIds]
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

    res.status(200).json(buckets);
  } catch (error) {
    console.error("Error fetching buckets:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { listBuckets };
