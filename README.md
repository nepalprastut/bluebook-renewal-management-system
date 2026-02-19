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



