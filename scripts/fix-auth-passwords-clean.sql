USE auth_db;

SET FOREIGN_KEY_CHECKS = 0;

DELETE FROM users;

INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('1017701', '$2b$12$x0ZR7xn3VUaFcWDjys0qheyd1SzzyecMLrdbVdCRBUFmJk6M/sU52', '하동훈', 'Staff', 1, 1);

INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('test123', '$2b$12$dCe0U.ZBaP73WVR0m/QpdexBlx5lAx.OUPfoIgi51VxXuSe8tuCum', '테스트', '테스트지점', 0, 1);

INSERT INTO users (employee_id, password, username, branch, is_admin, is_active) VALUES
('123456', '$2b$12$nhzQS7Mu9Kp7gRKqehpL..tsobOsLh9PpXxiLN7vncuqNIV.9SVOu', '간단테스트', '테스트', 0, 1);

SET FOREIGN_KEY_CHECKS = 1;

SELECT employee_id, username, branch, is_admin FROM users;