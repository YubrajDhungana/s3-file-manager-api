const {
  saveBucketCredentials,
  saveAccountcredentials,
} = require("./configs/s3");
require("dotenv").config();

const insertBucketData = async () => {
  const bucketData = {
    account_id: 1,
    bucket_alias: "",
    aws_bucket_url: "",
  };

  try {
    const bucketId = await saveBucketCredentials(bucketData);
    console.log("Bucket data inserted successfully:", bucketId);
  } catch (error) {
    console.error("Error inserting bucket data:", error);
  }
};

const insertAccountData = async () => {
  const accountData = {
    account_name: "qa-server",
    access_key_id: process.env.AWS_ACCESS_KEY_ID_THIRD,
    secret_access_key: process.env.AWS_SECRET_ACCESS_KEY_THIRD,
    region: process.env.AWS_DEFAULT_REGION_THIRD,
  };
  try {
    const res = await saveAccountcredentials(accountData);
    console.log("account created successfully:", res);
  } catch (error) {
    console.error("Error inserting account data:", error);
  }
};

//insertAccountData();
insertBucketData();
