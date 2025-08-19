const db = require("../configs/db");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();
const loginCheck = async (req, res) => {
  try {
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
    const jti = uuidv4();
    const expiresIn = "1hr";
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        jti: jti,
      },
      process.env.SECRET_KEY,
      { expiresIn }
    );

    await db.query(
      "INSERT INTO auth_tokens (user_id, jti, expires_at) VALUES (?, ?, ?)",
      [user.id, jti, expiresAt]
    );
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 60 * 60 * 1000,
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
  res.status(200).json({
    authenticated: true,
    name: req.user.name,
    email: req.user.email,
  });
};

const logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      await db.query(
        "UPDATE auth_tokens SET is_revoked=TRUE,revoked_at=NOW() WHERE jti=?",
        [decoded.jti]
      );
    }
    res.clearCookie("token", {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    });
    res.status(200).json({ message: "Logged out successfully" });
  } catch(error) {
    console.error("Error during logout:", error);
    res.status(500).json({ message: "Error during logout" });
  }
};

module.exports = {
  loginCheck,
  authcheck,
  logout,
};
