const db = require("../configs/db");
const {decrypt}  = require("../utils/cryptoUtils");
const getAccounts = async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, account_name FROM buckets");
    console.log("rows", rows);
    const account = rows.map((row) => ({
      id: row.id,
      account_name: decrypt(row.account_name),
    }));
    res.status(200).json(account);
  } catch (error) {
    console.error("Error fetching account:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
module.exports = { getAccounts };
