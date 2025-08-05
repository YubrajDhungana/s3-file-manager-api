const jwt = require("jsonwebtoken");
require("dotenv").config();
const authMiddleware = (req, res, next) => {
  try {
    // const authHeader = req.headers["authorization"];
    // if (!authHeader) {
    //   return res.status(401).json({ message: "Authorization header missing" });
    // }
    // const token = authHeader.split(" ")[1];
    // console.log("Auth middleware called");
    // const token = req.cookies.token;
    console.log("Token from cookie:", req.cookies.token);
    const token = req.cookies.token;
    if (!token) {
      return res.status(200).json({ message: "Token missing from header" });
    }

    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid token" });
    }
    console.log(decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware;
