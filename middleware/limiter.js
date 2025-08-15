const rateLimit = require("express-rate-limit");

//rate limiter for all

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests from this IP, please try again later.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many login attempts, please try again later.",
    });
  },
  skipSuccessfulRequests: true,
  standardHeaders: true
});

module.exports = {
  generalLimiter,
  authLimiter,
};
