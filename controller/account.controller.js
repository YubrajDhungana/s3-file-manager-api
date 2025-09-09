const db = require("../configs/db");
const { decrypt } = require("../utils/cryptoUtils");
const { saveUserCredentials } = require("../configs/s3");
const getAccounts = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user] = await db.query("SELECT user_type FROM user WHERE id=?", [
      userId,
    ]);

    if (user.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    const [role] = await db.query(
      "SELECT r.name,r.id from roles r join user_roles ur on r.id = ur.role_id where ur.user_id=?",
      [userId]
    );

    if (role.length === 0 && user[0].user_type.toLowerCase() === "user") {
      return res.status(403).json({ message: "No roles assigned" });
    }

    let rows = [];

    if (
      user[0].user_type.toLowerCase() === "superadmin" ||
      role[0].name.toLowerCase() === "admin"
    ) {
      [rows] = await db.query("SELECT id, account_name FROM aws_accounts");
    } else {
      [rows] = await db.query(
        "SELECT id,account_name from aws_accounts where id IN ( SELECT account_id from role_buckets where role_id =?)",
        [role[0].id]
      );
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

const addUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (req.user.user_type !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can delete roles" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
      });
    }

    // Check if user already exists
    const [existingUser] = await db.query(
      "SELECT id FROM user WHERE email = ?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(409).json({
        message: "User with this email already exists",
      });
    }

    const userData = {
      name,
      email,
      password,
    };

    const result = await saveUserCredentials(userData);
    res.status(201).json({
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.log("Internal server error", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    if (req.user.user_type !== "superadmin") {
      return res
        .status(403)
        .json({ message: "Only superadmin can delete roles" });
    }

    const [result] = await db.query("DELETE FROM user WHERE id = ?", [userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("error deleting user", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports = { getAccounts, addUser, deleteUser };
