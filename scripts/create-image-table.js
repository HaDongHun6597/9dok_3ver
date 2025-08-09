const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: 'idvvbi.com',
  port: 3307,
  user: 'app_user',
  password: 'AppUser2024!@#',
  database: 'subscription_db',
  connectionLimit: 5
});

async function createTable() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('MariaDB connected...');

    const query = `
      CREATE TABLE IF NOT EXISTS model_images (
        no INT PRIMARY KEY,
        model_name VARCHAR(255) NOT NULL,
        image_url TEXT,
        etland VARCHAR(50),
        homeplus VARCHAR(50),
        emart VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(model_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    await conn.query(query);
    console.log('Table "model_images" created successfully or already exists.');

  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

createTable();
