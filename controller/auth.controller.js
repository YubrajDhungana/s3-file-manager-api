const db = require("../configs/db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const loginCheck = async (req, res) => {
  try {
    console.log("login check called");
  
    const email = req.body.email;
    const password = req.body.password;
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const [rows] = await db.query(
      "SELECT * FROM user WHERE email = ? and password = ?",
      [email, password]
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (rows[0].status === "revoked") {
      return res.status(401).json({ message: "you are not allowed to login" });
    }
    const user = rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        name:user.name,
        email: user.email,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1hr" }
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 50 * 60 * 1000,
    });
    res.status(200).json({
      message: "login successfull",
      user: {
        name: user.name,
        email: user.email,
      },
      token: token,
    });
  } catch (error) {
    console.log("an error occurred while login check ", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const authcheck = (req, res) => {
  console.log("auth check called");
  res.status(200).json({
    authenticated: true,
    name: req.user.name,
    email: req.user.email,
  });
};
const logout = async (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch {
    res.status(500).json({ message: "Error during logout" });
  }
};

module.exports = {
  loginCheck,
  authcheck,
  logout,
};
