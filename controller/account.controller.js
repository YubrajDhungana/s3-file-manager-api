const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");
const getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await  db.query(
      "SELECT user_type FROM user WHERE id=?",[userId]
    );

    if(user.length === 0){
      return res.status(401).json({ message: "User not found" });
    }

    const [role] = await db.query("SELECT r.name,r.id from roles r join user_roles ur on r.id = ur.role_id where ur.user_id=?", [userId]);

    if(role.length === 0 && user[0].user_type.toLowerCase() === "user"){
      return res.status(403).json({ message: "Unauthorized: No roles assigned" });
    }

    let rows = [];

    if((user[0].user_type.toLowerCase() === "superadmin") || role[0].name.toLowerCase()==='admin'){
      [rows] = await db.query("SELECT id, account_name FROM aws_accounts");
    }else{
      [rows] = await db.query("SELECT id,account_name from aws_accounts where id IN ( SELECT account_id from role_buckets where role_id =?)",[role[0].id])
    }

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
