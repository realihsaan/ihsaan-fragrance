import mysql from "mysql2/promise";

let pool;

export function getDatabasePool() {
  if (!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE || !process.env.MYSQL_USER || !process.env.MYSQL_PASSWORD) {
    throw new Error("Local MySQL is not configured. Run npm run db:setup.");
  }

  pool ||= mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    decimalNumbers: true,
    timezone: "Z",
  });
  return pool;
}

export async function pingDatabase() {
  const [rows] = await getDatabasePool().query("SELECT 1 AS connected");
  return rows[0]?.connected === 1;
}
