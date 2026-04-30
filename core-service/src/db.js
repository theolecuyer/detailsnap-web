import mysql from 'mysql2/promise';

let pool;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'detailsnap',
      password: process.env.DB_PASSWORD || 'changeme',
      database: process.env.DB_NAME || 'detailsnap',
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      timezone: 'Z',
      typeCast(field, next) {
        if (field.type === 'TINY' && field.length === 1) {
          return field.string() === '1';
        }
        return next();
      },
    });
  }
  return pool;
}

export async function ping() {
  const conn = await getPool().getConnection();
  await conn.ping();
  conn.release();
}
