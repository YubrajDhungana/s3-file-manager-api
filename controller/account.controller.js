const { accounts } = require("../configs/db");
const getAccounts = async (req, res) => {
  try {
    res.json({ accounts: accounts, status: 200 });
  } catch (error) {
    console.error("Error fetching accounts:", error);
    res.status(500).json({ message: error.message });
  }
};
module.exports = {getAccounts}
