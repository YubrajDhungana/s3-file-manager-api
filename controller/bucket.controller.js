const { buckets } = require("../configs/db");

const getBucketsById = async (req, res) => {
  try {
    const accountId = req.params.accountId;
    const accountBuckets = buckets.filter(
      (bucket) => bucket.accountId === accountId
    );
    res.json({ buckets: accountBuckets, status: 200 });
  } catch (error) {
    console.error("Error fetching buckets:", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {getBucketsById}
