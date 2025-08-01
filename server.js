const express = require("express");
const app = express();
const cors = require("cors");
const accountRoutes = require("./routes/account.routes");
const bucketRoutes = require("./routes/bucket.routes");
const fileRoutes = require("./routes/file.routes");
const authRoutes = require("./routes/auth.routes");

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/accounts", accountRoutes);
app.use("/api/buckets", bucketRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/auth", authRoutes);

app.listen(3000, () => console.log("server is running on port 3000"));
