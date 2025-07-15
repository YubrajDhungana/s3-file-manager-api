const express = require("express");
const app = express();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const accountRoutes = require("./routes/account.routes");
const bucketRoutes = require("./routes/bucket.routes");
const fileRoutes = require("./routes/file.routes");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//database connection
mongoose
  .connect("mongodb://localhost:27017/s3-file-manager", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });

//creating directory if it does not exist
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.originalname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage });

app.use("/api/accounts", accountRoutes);
app.use("/api/buckets", bucketRoutes);
app.use("/api/files", upload.single("file"), fileRoutes);

app.get("/temp", (req, res) => {
  res.json({ message: "this is for testing" });
});

app.listen(3000, () => console.log("server is running on port 3000"));
