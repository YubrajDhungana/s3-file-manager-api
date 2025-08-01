const db = require("../configs/db");
const jwt = require("jsonwebtoken");
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
    console.log(user);
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
      },
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
    );
    return res.status(200).json({
      message: "login successfull",
      user: {
        name: user.name,
        email: user.email,
      },
      token: token,
    });
  } catch (error) {
    console.log("an error occurred while login check ", error);
  }
};

module.exports = {
  loginCheck,
};
