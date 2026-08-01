// Local development defaults below. When deployed on a host like Railway,
// the platform sets environment variables automatically (MYSQLHOST, etc.)
// which take priority over these defaults - you don't need to edit this
// file again after deploying.
module.exports = {
  host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
  port: Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306),
  user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
  password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'library_management'
};
