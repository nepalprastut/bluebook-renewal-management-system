# Bluebook Renewal Management System

A full-stack web application for managing vehicle bluebook expiry, renewals, payments, and officer approvals.

**Live Demo:**  
https://bluebook-renewal-management-system.onrender.com

---

## Overview

This project simulates a real-world vehicle bluebook renewal workflow. It allows vehicle owners to register vehicles, renew expired bluebooks, and make payments. Renewal requests require officer approval before activation.


---

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js, Express  
- **Database:** PostgreSQL  
- **Hosting:** Render  

---

## Features

- User authentication with roles (Owner, Officer, Admin)
- Add and view registered vehicles
- Automatic bluebook expiry tracking
- Renew button visible only when expired
- Renewal payment simulation
- Officer approval workflow
- Admin user management
- Renewal & payment history tracking

---

## Database Structure

Main tables:

- `users`
- `vehicle_owners`
- `vehicles`
- `bluebooks`
- `renewals`
- `payments`
- `officers`

Relational structure:

```
users → vehicle_owners → vehicles → bluebooks → renewals → payments
```

---

## Running Locally

### 1. Clone Repository

```bash
git clone https://github.com/nepalprastut/bluebook-renewal-management-system.git
cd bluebook-renewal-management-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Create a `.env` file in the root:

```
DATABASE_URL=your_postgresql_connection_string
```

### 4. Start Server

```bash
npm start
```

Visit:

```
http://localhost:3000
```

---

# Database Schema Documentation

This segment provides a detailed breakdown of the PostgreSQL relational schema used in the **Bluebook Renewal Management System**. The database is designed to maintain high data integrity through foreign key constraints and specific data types.

---

## Entity Relationship Overview

The database consists of 8 interconnected tables. The core of the system revolves around the `users` table, which branches into `vehicle_owners` and `officers` to separate concerns based on user roles.



---

## Table Definitions

### 1. `users`
Stores core authentication data for both Owners and Admins.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | SERIAL | PRIMARY KEY | Unique identifier for each user. |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Unique login handle. |
| `password_hash` | TEXT | NOT NULL | Bcrypt hashed password. |
| `role` | VARCHAR(20) | CHECK (OWNER, ADMIN) | Defines access levels across the app. |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Record creation timestamp. |

### 2. `vehicle_owners`
Extended profile information for users with the 'OWNER' role.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `owner_id` | SERIAL | PRIMARY KEY | Unique identifier. |
| `user_id` | INTEGER | FK (users.user_id) | Links to the auth account. |
| `full_name` | VARCHAR(100) | NOT NULL | Legal name of the owner. |
| `phone_number` | VARCHAR(15) | UNIQUE | Contact for notifications. |
| `address` | TEXT | - | Physical address. |

### 3. `vehicles`
Stores physical attributes of the vehicles registered in the system.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `vehicle_id` | SERIAL | PRIMARY KEY | Unique identifier. |
| `owner_id` | INTEGER | FK (vehicle_owners.owner_id) | Links vehicle to a profile. |
| `plate_no` | VARCHAR(20) | UNIQUE, NOT NULL | License plate number. |
| `vehicle_type` | VARCHAR(50) | NOT NULL | e.g., Car, Bike, Scooter. |
| `engine_no` | VARCHAR(50) | UNIQUE | Manufacturer engine ID. |
| `chassis_no` | VARCHAR(50) | UNIQUE | Manufacturer chassis ID. |

### 4. `bluebooks`
Tracks the legal status and expiration of the vehicle's documentation.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `bluebook_id` | SERIAL | PRIMARY KEY | Unique identifier. |
| `vehicle_id` | INTEGER | FK (vehicles.vehicle_id) | Links to physical vehicle. |
| `expiry_date` | DATE | NOT NULL | When the current tax expires. |
| `status` | VARCHAR(20) | DEFAULT 'ACTIVE' | ACTIVE, EXPIRED, or PENDING. |

### 5. `tax_prices`
A lookup table used by the backend to calculate fees automatically.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `tax_id` | SERIAL | PRIMARY KEY | Unique identifier. |
| `vehicle_type` | VARCHAR(50) | UNIQUE | Key used for lookup (e.g., 'Car'). |
| `annual_tax` | DECIMAL(10,2) | NOT NULL | The base price for renewal. |

### 6. `renewals` (or `payments`)
Records the history of tax settlement attempts and their outcomes.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `renewal_id` | SERIAL | PRIMARY KEY | Unique identifier. |
| `bluebook_id` | INTEGER | FK (bluebooks.bluebook_id) | Links to the specific book. |
| `amount_paid` | DECIMAL(10,2) | NOT NULL | Calculated tax amount. |
| `payment_date` | DATE | DEFAULT CURRENT_DATE | When the user submitted payment. |
| `status` | VARCHAR(20) | DEFAULT 'PENDING' | PENDING, APPROVED, REJECTED. |
| `transaction_id`| VARCHAR(100)| - | Reference from eSewa/Khalti. |

### 7. `officers`
Extended profile for administrative users.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `officer_id` | SERIAL | PRIMARY KEY | Unique identifier. |
| `user_id` | INTEGER | FK (users.user_id) | Links to the auth account. |
| `full_name` | VARCHAR(100) | - | Name of the verifier. |
| `designation` | VARCHAR(50) | - | Office rank or department. |

---

## Key Data Flows

### The Renewal Trigger
When an Officer updates a `renewals.status` to **'APPROVED'**, a backend transaction is triggered to:
1. Update the `bluebooks.expiry_date` by adding 1 year to the existing date.
2. Set the `bluebooks.status` back to **'ACTIVE'**.

### User Deletion
The schema implements `ON DELETE CASCADE` (or manual deletion logic) to ensure that if a user is removed, their associated owner profile and vehicle records are handled without leaving orphaned data.

---


## Test Flow

1. Login as Owner → Add vehicle  
2. If expired → Click Renew  
3. Simulate payment  
4. Create a user with ADMIN role using SQL query
4. Login as Officer → Approve payment  
5. Bluebook status updates to ACTIVE  

---

## Deployment

- Backend, Frontend and PostgreSQL deployed on Render
- Environment variables configured in Render dashboard

---






