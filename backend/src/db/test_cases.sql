-- Some sample test cases while designing the schema

SELECT o.full_name, v.plate_no, b.expiry_date, b.status
FROM vehicle_owners o
JOIN vehicles v ON o.owner_id = v.owner_id
JOIN bluebooks b ON v.vehicle_id = b.vehicle_id;


SELECT v.plate_no, b.expiry_date
FROM vehicles v
JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
WHERE b.expiry_date < CURRENT_DATE;



SELECT r.renewal_date, r.valid_from, r.valid_to, r.total_amount
FROM renewals r
JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
WHERE v.plate_no = 'BA-2-PA-1234';


SELECT v.plate_no, p.amount, p.payment_date
FROM payments p
JOIN renewals r ON p.renewal_id = r.renewal_id
JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
JOIN vehicles v ON b.vehicle_id = v.vehicle_id;



ALTER TABLE renewals
ADD CONSTRAINT chk_valid_renewal
CHECK (valid_from <= valid_to);


ALTER TABLE payments
ADD CONSTRAINT chk_payment_amount
CHECK (amount > 0);


ALTER TABLE bluebooks
ADD CONSTRAINT chk_bluebook_status
CHECK (status IN ('ACTIVE', 'EXPIRED'));



INSERT INTO vehicles (owner_id, plate_no)
VALUES (1, 'BA-2-PA-1234');


INSERT INTO vehicles (owner_id, plate_no)
VALUES (999, 'BA-2-PA-9999');


INSERT INTO payments (renewal_id, payment_date, amount)
VALUES (1, CURRENT_DATE, -500);


INSERT INTO payments (renewal_id, payment_date, amount)
VALUES (1, CURRENT_DATE, 2500);

INSERT INTO vehicles (owner_id, plate_no, vehicle_type, engine_no, chassis_no)
VALUES (1, 'BA-2-PA-1234', 'Bike', 'ENG123', 'CHS123');

INSERT INTO vehicles (owner_id, plate_no, vehicle_type, engine_no, chassis_no)
VALUES (6, 'BA-2-PA-1264', 'Car', 'ENG133', 'CHS128');


INSERT INTO bluebooks (vehicle_id, issue_date, expiry_date, status)
VALUES (1, '2023-01-01', '2024-01-01', 'EXPIRED');

INSERT INTO bluebooks (vehicle_id, issue_date, expiry_date, status)
VALUES (16, '2024-01-01', '2025-01-01', 'EXPIRED');

INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount)
VALUES (1, '2024-02-01', '2024-02-01', '2025-02-01', 2500);


INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount)
VALUES (2, '2024-07-15', '2024-07-15', '2025-07-15', 3000);

INSERT INTO payments (renewal_id, payment_date, amount, payment_method)
VALUES (1, '2024-02-01', 2500, 'Cash');

INSERT INTO payments (renewal_id, payment_date, amount, payment_method)
VALUES (3, '2025-02-01', 3000, 'Cash');

INSERT INTO users (username, password_hash, role)
VALUES ('officer1', 'hashed_pw', 'OFFICER');

INSERT INTO officers (user_id, full_name, designation)
VALUES (2, 'Sita Sharma', 'Transport Officer');

INSERT INTO vehicle_owners (user_id, full_name, citizenship_no, district, mobile_no)
VALUES (1, 'Ram Bahadur', '123-456', 'Kathmandu', '98XXXXXXXX');

INSERT INTO vehicle_owners (user_id, full_name, citizenship_no, district, mobile_no)
VALUES (2, 'Hari Bahadur', '987-987', 'Lalitpur', '98XXXXXXXX');

INSERT INTO users (username, password_hash, role)
VALUES ('prastut', 'hashed_pw', 'OWNER');

SELECT v.vehicle_id, v.plate_no, b.bluebook_id, b.expiry_date, b.status
FROM vehicles v
JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
WHERE v.owner_id IN (
  SELECT owner_id FROM vehicle_owners WHERE user_id = 17
);