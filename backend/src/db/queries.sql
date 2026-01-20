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




