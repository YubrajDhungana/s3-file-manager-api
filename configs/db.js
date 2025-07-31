const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host:process.env.HOST_NAME,
  user:process.env.USER_NAME,
  password:process.env.PASSWORD,
  database:process.env.DATABASE_NAME,
  waitForConnections: true, 
  connectionLimit: 10, // max number of connections
  queueLimit: 0, 
  idleTimeout: 60000, // milliseconds a connection can be idle
}).promise()

module.exports = pool;