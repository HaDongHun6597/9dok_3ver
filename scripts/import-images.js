const mariadb = require('mariadb');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const pool = mariadb.createPool({
  host: 'idvvbi.com',
  port: 3307,
  user: 'app_user',
  password: 'AppUser2024!@#',
  database: 'subscription_db',
  connectionLimit: 5
});

async function importImageData() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('MariaDB connected...');

    const images = [];
    const filePath = path.join(__dirname, '../구독카달로그 - 모델별이미지.csv');

    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          images.push([
            row['no'],
            row['모델명'],
            row['링크'],
            row['전자랜드'],
            row['홈플러스'],
            row['이마트']
          ]);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    console.log(`CSV file successfully processed. ${images.length} records found.`);
    console.log('Inserting data into model_images table...');

    // Using 'IGNORE' to prevent errors on duplicate primary keys if the script is run multiple times
    const query = 'INSERT IGNORE INTO model_images (no, model_name, image_url, etland, homeplus, emart) VALUES (?, ?, ?, ?, ?, ?)';
    
    // mariadb driver expects an array of arrays for bulk insert
    await conn.batch(query, images);

    console.log(`${images.length} records have been imported successfully.`);

  } catch (err) {
    console.error('Error importing data:', err);
  } finally {
    if (conn) conn.release();
    pool.end();
  }
}

importImageData();
