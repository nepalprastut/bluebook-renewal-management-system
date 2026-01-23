CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'OFFICER', 'ADMIN'))
);

INSERT INTO users (username, password_hash, role)
VALUES ('prastut', 'hashed_pw', 'OWNER');

SELECT * FROM users;


CREATE TABLE vehicle_owners (
    owner_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    citizenship_no VARCHAR(30) UNIQUE NOT NULL,
    district VARCHAR(50),
    mobile_no VARCHAR(20),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);


INSERT INTO vehicle_owners (user_id, full_name, citizenship_no, district, mobile_no)
VALUES (1, 'Ram Bahadur', '123-456', 'Kathmandu', '98XXXXXXXX');

INSERT INTO vehicle_owners (user_id, full_name, citizenship_no, district, mobile_no)
VALUES (2, 'Hari Bahadur', '987-987', 'Lalitpur', '98XXXXXXXX');


SELECT * FROM vehicle_owners;


CREATE TABLE officers (
    officer_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    designation VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);

INSERT INTO users (username, password_hash, role)
VALUES ('officer1', 'hashed_pw', 'OFFICER');

INSERT INTO officers (user_id, full_name, designation)
VALUES (2, 'Sita Sharma', 'Transport Officer');

SELECT * FROM officers;



CREATE TABLE vehicles (
    vehicle_id SERIAL PRIMARY KEY,
    owner_id INT NOT NULL,
    plate_no VARCHAR(20) UNIQUE NOT NULL,
    vehicle_type VARCHAR(30),
    engine_no VARCHAR(50) UNIQUE,
    chassis_no VARCHAR(50) UNIQUE,
    FOREIGN KEY (owner_id) REFERENCES vehicle_owners(owner_id)
);



INSERT INTO vehicles (owner_id, plate_no, vehicle_type, engine_no, chassis_no)
VALUES (1, 'BA-2-PA-1234', 'Bike', 'ENG123', 'CHS123');

INSERT INTO vehicles (owner_id, plate_no, vehicle_type, engine_no, chassis_no)
VALUES (6, 'BA-2-PA-1264', 'Car', 'ENG133', 'CHS128');



SELECT * FROM vehicles;


CREATE TABLE bluebooks (
    bluebook_id SERIAL PRIMARY KEY,
    vehicle_id INT UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);


INSERT INTO bluebooks (vehicle_id, issue_date, expiry_date, status)
VALUES (1, '2023-01-01', '2024-01-01', 'EXPIRED');

INSERT INTO bluebooks (vehicle_id, issue_date, expiry_date, status)
VALUES (16, '2024-01-01', '2025-01-01', 'EXPIRED');

SELECT * FROM bluebooks;



CREATE TABLE renewals (
    renewal_id SERIAL PRIMARY KEY,
    bluebook_id INT NOT NULL,
    officer_id INT,
    renewal_date DATE NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    total_amount NUMERIC(10,2),
    FOREIGN KEY (bluebook_id) REFERENCES bluebooks(bluebook_id),
    FOREIGN KEY (officer_id) REFERENCES officers(officer_id)
);


INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount)
VALUES (1, '2024-02-01', '2024-02-01', '2025-02-01', 2500);


INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount)
VALUES (2, '2024-07-15', '2024-07-15', '2025-07-15', 3000);



SELECT * FROM renewals;


CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    renewal_id INT UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30),
    FOREIGN KEY (renewal_id) REFERENCES renewals(renewal_id)
);



INSERT INTO payments (renewal_id, payment_date, amount, payment_method)
VALUES (1, '2024-02-01', 2500, 'Cash');

INSERT INTO payments (renewal_id, payment_date, amount, payment_method)
VALUES (3, '2025-02-01', 3000, 'Cash');

SELECT * FROM payments;


SELECT * FROM vehicles;


SELECT * FROM users;
SELECT * FROM vehicle_owners;



DELETE FROM renewals 
WHERE renewal_id = 2;



