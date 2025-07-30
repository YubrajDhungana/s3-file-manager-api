const db = require("../configs/db");

const listBuckets = async (req,res) =>{
  try{
    const [rows] = await db.query('SELECT id, bucket_name FROM buckets');
    res.status(200).json(rows)
  }catch(error){
    console.error('Error fetching buckets:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

module.exports = {listBuckets}
