CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'OFFICER', 'ADMIN'))
);



INSERT INTO users (username, password_hash, role)
VALUES ('administrator', 'admin123', 'ADMIN');

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




SELECT * FROM vehicle_owners;


CREATE TABLE officers (
    officer_id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    designation VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);



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





SELECT * FROM vehicles;


CREATE TABLE bluebooks (
    bluebook_id SERIAL PRIMARY KEY,
    vehicle_id INT UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(vehicle_id)
);



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



SELECT * FROM renewals;


CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    renewal_id INT UNIQUE NOT NULL,
    payment_date DATE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    payment_method VARCHAR(30),
    FOREIGN KEY (renewal_id) REFERENCES renewals(renewal_id)
);




SELECT * FROM payments;


SELECT * FROM vehicles;


SELECT * FROM users;
SELECT * FROM vehicle_owners;


SELECT * FROM users;

SELECT * FROM payments;
SELECT * FROM renewals;


ALTER TABLE payments
ADD COLUMN status VARCHAR(20) DEFAULT 'PENDING';

ALTER TABLE payments
ADD COLUMN verified_by INTEGER REFERENCES users(user_id);

ALTER TABLE payments
ADD COLUMN verified_at TIMESTAMP;

SELECT * FROM officers;


ALTER TABLE bluebooks ADD COLUMN last_renewal_date DATE;

ALTER TABLE payments ADD COLUMN rejection_reason TEXT;

SELECT expiry_date FROM bluebooks WHERE bluebook_id = 20;

CREATE TABLE tax_prices (
	id SERIAL PRIMARY KEY,
	vehicle_type VARCHAR(50) UNIQUE NOT NULL,
	base_price NUMERIC(10, 2) NOT NULL
);

INSERT INTO tax_prices (vehicle_type, base_price) VALUES 
('Scooter', 2500),
('Bike', 3000),
('Car', 15000),
('Truck', 35000),
('Bus', 25000);


ALTER TABLE tax_prices 
ADD CONSTRAINT check_positive_tax 
CHECK (base_price >= 0);