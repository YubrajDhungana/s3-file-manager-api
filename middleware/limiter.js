const rateLimit = require("express-rate-limit");

//rate limiter for all

const generalLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  handler: (req, res) => {
    res.status(429).json({
      message: "Too many requests from this IP, please try again later.",
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  handler: (req, res) => {
    res.status(429).json({
      message: `Too many login attempts, please try again after ${new Date(
        Date.now() + 15 * 60 * 1000
      ).toLocaleTimeString()}`,
    });
  },
  skipSuccessfulRequests: true,
  standardHeaders: true,
});

module.exports = {
  generalLimiter,
  authLimiter,
};
