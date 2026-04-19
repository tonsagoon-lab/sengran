# วิธีรัน SQL Migrations บน Supabase

## ขั้นตอน (ทำครั้งเดียวต่อ migration)

1. ไปที่ [Supabase Dashboard](https://supabase.com/dashboard) → เลือกโปรเจกต์
2. คลิก **SQL Editor** ในเมนูซ้าย
3. คลิก **New query**
4. รัน migration ตามลำดับ:

---

### 0001_initial_schema.sql
- Copy ทั้งหมดจาก `supabase/migrations/0001_initial_schema.sql`
- Paste ใน SQL Editor แล้วกด **Run**
- สร้าง: tables, indexes, triggers, RLS policies

### 0002_seed_data.sql
- Copy ทั้งหมดจาก `supabase/migrations/0002_seed_data.sql`
- Paste แล้วกด **Run**
- เพิ่มข้อมูล: 77 จังหวัด, 10 หมวดหมู่, 12 สิ่งอำนวยความสะดวก

---

## ตรวจสอบว่า migrations สำเร็จ

ใน Supabase Dashboard → **Table Editor** ควรเห็น:
- `profiles`, `categories`, `provinces`, `amenities`
- `listings`, `listing_images`, `listing_amenities`
- `transactions`, `boosts`, `favorites`

ใน **Authentication → Triggers** ควรเห็น trigger `trg_on_auth_user_created`

---

## Storage Bucket (ทำด้วยมือครั้งเดียว)

ไปที่ **Storage** → **New bucket**:
- Bucket name: `listing-images`
- Public: ✅ (ภาพประกาศต้องให้คนอื่นดูได้)

Policies: ให้ authenticated users upload ได้, public read

---

## Supabase Auth Settings

ไปที่ **Authentication → Settings**:
- Site URL: `http://localhost:3000` (dev) → เปลี่ยนเป็น production URL ตอน deploy
- Redirect URLs เพิ่ม: `http://localhost:3000/auth/callback`
