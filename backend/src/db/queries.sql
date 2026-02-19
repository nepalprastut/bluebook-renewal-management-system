-- =============================================================================
-- BLUEBOOK RENEWAL SYSTEM - DATABASE QUERIES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. VEHICLE MANAGEMENT (vehicles.js)
-- -----------------------------------------------------------------------------

-- Find owner_id
SELECT owner_id FROM vehicle_owners WHERE user_id = $1;

-- Insert Vehicle
INSERT INTO vehicles (owner_id, plate_no, vehicle_type, engine_no, chassis_no) 
VALUES ($1, $2, $3, $4, $5) RETURNING vehicle_id;

-- Initialize Bluebook with interval calculation
INSERT INTO bluebooks (vehicle_id, last_renewal_date, issue_date, expiry_date, status) 
VALUES ($1, $2, $2, ($2::date + INTERVAL '1 year'), 
CASE WHEN ($2::date + INTERVAL '1 year') < CURRENT_DATE THEN 'EXPIRED' ELSE 'ACTIVE' END);

-- List vehicles with latest payment status subquery
SELECT v.*, b.bluebook_id, b.expiry_date, 
(SELECT p.status FROM payments p 
 JOIN renewals r ON p.renewal_id = r.renewal_id 
 WHERE r.bluebook_id = b.bluebook_id 
 ORDER BY p.payment_id DESC LIMIT 1) as latest_payment_status
FROM vehicles v
JOIN bluebooks b ON v.vehicle_id = b.vehicle_id
JOIN vehicle_owners o ON v.owner_id = o.owner_id
WHERE o.user_id = $1;


-- -----------------------------------------------------------------------------
-- 2. RENEWAL & PAYMENT LOGIC (renewals.js)
-- -----------------------------------------------------------------------------

-- Fetch Renewal History (MAX ID grouping)
SELECT v.plate_no, r.renewal_date, p.amount, p.status, 
       p.rejection_reason, b.bluebook_id, p.payment_date, p.payment_method
FROM payments p
JOIN renewals r ON p.renewal_id = r.renewal_id
JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
WHERE p.payment_id IN (
    SELECT MAX(p2.payment_id)
    FROM payments p2
    JOIN renewals r2 ON p2.renewal_id = r2.renewal_id
    JOIN bluebooks b2 ON r2.bluebook_id = b2.bluebook_id
    JOIN vehicles v2 ON b2.vehicle_id = v2.vehicle_id
    JOIN vehicle_owners o2 ON v2.owner_id = o2.owner_id
    WHERE o2.user_id = $1
    GROUP BY v2.vehicle_id
)
ORDER BY p.payment_date DESC;

-- Get payment info with tax_prices JOIN
SELECT v.plate_no, v.vehicle_type, tp.base_price as amount
FROM bluebooks b 
JOIN vehicles v ON b.vehicle_id = v.vehicle_id 
JOIN tax_prices tp ON v.vehicle_type = tp.vehicle_type 
WHERE b.bluebook_id = $1::int;

-- Fetch base_price and expiry_date for transaction
SELECT tp.base_price, b.expiry_date 
FROM bluebooks b
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
JOIN tax_prices tp ON v.vehicle_type = tp.vehicle_type
WHERE b.bluebook_id = $1::int;

-- Create Renewal Record
INSERT INTO renewals (bluebook_id, renewal_date, valid_from, valid_to, total_amount) 
VALUES ($1, CURRENT_DATE, $2, $3, $4) RETURNING renewal_id;

-- Create Payment Record
INSERT INTO payments (renewal_id, payment_date, amount, payment_method, status) 
VALUES ($1, CURRENT_DATE, $2, $3, 'PENDING');


-- -----------------------------------------------------------------------------
-- 3. OFFICER VERIFICATION (officer.js)
-- -----------------------------------------------------------------------------

-- Pending Queue
SELECT p.payment_id, v.plate_no, v.vehicle_type, o.full_name, p.amount, 
       p.payment_method, p.payment_date
FROM payments p
JOIN renewals r ON p.renewal_id = r.renewal_id
JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
JOIN vehicle_owners o ON v.owner_id = o.owner_id
WHERE p.status = 'PENDING'
ORDER BY p.payment_date ASC;

-- Details for Inspection
SELECT p.payment_id, p.amount, p.payment_method, p.payment_date,
       v.plate_no, v.vehicle_type, v.engine_no, v.chassis_no,
       o.full_name, o.citizenship_no, o.mobile_no,
       b.expiry_date as current_expiry
FROM payments p
JOIN renewals r ON p.renewal_id = r.renewal_id
JOIN bluebooks b ON r.bluebook_id = b.bluebook_id
JOIN vehicles v ON b.vehicle_id = v.vehicle_id
JOIN vehicle_owners o ON v.owner_id = o.owner_id
WHERE p.payment_id = $1;

-- Approve Payment
UPDATE payments 
SET status = 'APPROVED', verified_by = $1, verified_at = CURRENT_TIMESTAMP 
WHERE payment_id = $2;

-- Update Bluebook Expiry (Pulling valid_to from related renewal)
UPDATE bluebooks 
SET status = 'ACTIVE', 
    expiry_date = (
      SELECT r.valid_to 
      FROM renewals r 
      JOIN payments p ON r.renewal_id = p.renewal_id 
      WHERE p.payment_id = $1
    )
WHERE bluebook_id = (
  SELECT r.bluebook_id 
  FROM renewals r 
  JOIN payments p ON r.renewal_id = p.renewal_id 
  WHERE p.payment_id = $1
);

-- Reject Payment
UPDATE payments 
SET status = 'REJECTED', verified_by = $1, verified_at = CURRENT_TIMESTAMP, rejection_reason = $2 
WHERE payment_id = $3;


-- -----------------------------------------------------------------------------
-- 4. ADMIN & SYSTEM (admin.js)
-- -----------------------------------------------------------------------------

-- Create Officer User & Profile
INSERT INTO users (username, password_hash, role) VALUES ($1, $2, 'OFFICER') RETURNING user_id;
INSERT INTO officers (user_id, full_name, designation) VALUES ($1, $2, $3);

-- Manage Tax Prices
SELECT * FROM tax_prices ORDER BY vehicle_type ASC;
UPDATE tax_prices SET base_price = $1 WHERE id = $2;

-- Dashboard Statistics
SELECT SUM(amount) FROM payments WHERE status = 'APPROVED';
SELECT COUNT(*) FROM users WHERE role = 'OWNER';
SELECT COUNT(*) FROM payments WHERE status = 'PENDING';