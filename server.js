const express = require("express");
const app = express();
const multer = require("multer");
const mongoose = require("mongoose");
const accountRoutes = require("./routes/account.routes");
const bucketRoutes = require("./routes/bucket.routes");
const fileRoutes = require("./routes/file.routes");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//database connection
mongoose
  .connect("mongodb://localhost:27017/s3-file-manager", {})
  .then(() => {
    console.log("Database connected successfully");
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });



app.use("/api/accounts", accountRoutes);
app.use("/api/buckets", bucketRoutes);
app.use("/api/files", fileRoutes);

app.get("/temp", (req, res) => {
  res.json({ message: "this is for testing" });
});

app.listen(3000, () => console.log("server is running on port 3000"));
