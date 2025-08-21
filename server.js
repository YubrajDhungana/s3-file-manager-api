const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { generalLimiter } = require("./middleware/limiter");
const accountRoutes = require("./routes/account.routes");
const bucketRoutes = require("./routes/bucket.routes");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");

// TRUST PROXY
app.set("trust proxy", 1);

app.use(
  cors({
    origin: "https://bucketmanager.cloudtechservice.com", // frontend URL
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);

app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);
app.use("/api/accounts", accountRoutes);
app.use("/api/buckets", bucketRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/auth", authRoutes);

app.listen(3060, () => console.log("server is running on port 3060"));
