const mariadb = require('mariadb');

// MariaDB 연결 설정
const pool = mariadb.createPool({
  host: '192.168.0.200',      // 시놀로지 IP 주소
  port: 3307,                 // MariaDB 포트
  user: 'idvvbi',            // 기존 사용자명
  password: '1017701aA!@',   // 기존 비밀번호
  database: 'subscription_db', // 데이터베이스명
  connectionLimit: 10
});

module.exports = pool;