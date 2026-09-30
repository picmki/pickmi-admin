# PickMi Admin Panel (v2.0)

A high-performance command center and fleet dispatcher web application built for the **PickMi Driver App** ecosystem.

## Key Features

1. **Live Fleet Management**:
   - Track driver online/offline logins in realtime.
   - Monitor driver ratings, vehicle registration details, and active status.
   - Onboard new drivers with instant vehicle assignment.

2. **Trip Dispatcher**:
   - Create and dispatch rides to online drivers (with pickup, drop, fare, vehicle category, OTP, and coordinates).
   - Filter trips by status: `AVAILABLE`, `ASSIGNED`, `ARRIVED`, `STARTED`, `COMPLETED`, `CANCELLED`.
   - Live OTP verification support.

3. **Document Verification Center**:
   - Inspect uploaded driver documentation:
     - Driving Licence (Front & Back)
     - Registration Certificate (RC)
     - Vehicle Insurance
     - Commercial Vehicle Permit
   - One-click **Approve (Verified)** or **Reject** with customized reason.

4. **Security Deposit & Subscription Tracker**:
   - Monitors mandatory annual ₹250 driver security deposit.
   - Live status: `PAID` (1-year validity) vs `PENDING` (Due).
   - Record manual cash/UPI transaction reference numbers.

5. **Unified Supabase Realtime Sync**:
   - Direct connection to Supabase database.
   - Bi-directional sync with the **PickMi Driver Mobile App**.

---

## Getting Started

### 1. Start the Dev Server
From the admin panel folder (`/Users/karthikp/Desktop/V.2 _ Admin`):

```bash
npm run dev
```

Open your browser at:
`http://localhost:3000`

### 2. Build for Production
```bash
npm run build
```

---

## Supabase Database Setup

Both the **PickMi Driver App** and this **Admin Panel** share the same Supabase database:
- **Project URL**: `https://awwrbgwpzgtbunrvsmyu.supabase.co`

### To apply or verify tables:
1. Open your Supabase SQL Editor:
   [https://supabase.com/dashboard/project/awwrbgwpzgtbunrvsmyu/sql/new](https://supabase.com/dashboard/project/awwrbgwpzgtbunrvsmyu/sql/new)
2. Copy and paste the contents of `../V.2 _ Driver/supabase/schema.sql` (or click "Copy SQL Schema" directly in the Admin Panel UI).
3. Click **RUN**.
4. Both the mobile driver app and admin panel will instantly connect with live database tables!
