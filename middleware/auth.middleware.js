const jwt = require("jsonwebtoken");
const db = require("../configs/db");
require("dotenv").config();
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }
    const [rows] = await db.query(
      "SELECT is_revoked from auth_tokens WHERE jti= ? AND expires_at >NOW()",
      [decoded.jti]
    );
    if (rows.length === 0 || rows[0].is_revoked) {
      return res.status(401).json({ message: "Token revoked" });
    }
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
