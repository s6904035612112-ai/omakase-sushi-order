# omakase sushi — ระบบสั่งอาหารร้านบุฟเฟต์

## Stack
- Next.js (เวอร์ชันล่าสุด) App Router, **JavaScript เท่านั้น (ไม่ใช้ TypeScript)**
- Deploy บน Vercel, ฐานข้อมูลเป็น Supabase
- Supabase client: `lib/supabaseClient.js` (อ่านจาก `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

## กฎสำคัญ: params ของ Dynamic Route เป็น Promise
ใน Next.js เวอร์ชันนี้ `params` (และ `searchParams`) ของ Dynamic Route เป็น **Promise**
ต้อง unwrap ด้วย `use()` จาก React เสมอ:

```js
"use client";
import { use } from "react";

export default function OrderPage({ params }) {
  const { sessionId } = use(params);
  // ...
}
```

ห้ามอ่าน `params.sessionId` ตรง ๆ
(หมายเหตุ: `use()` ใช้ใน Client Component ที่มี `"use client"` — ถ้าเป็น Server Component ให้ทำเป็น `async` แล้ว `await params` แทน)

## โครงสร้างตารางฐานข้อมูล (มีอยู่แล้วใน Supabase — ไม่ต้องสร้างใหม่)
- **sessions**: id, table_number, adult_count, child_count, status, created_at
- **menu_categories**: id, name, sort_order
- **menu_items**: id, category_id, name
- **orders**: id, session_id, table_number, items (jsonb), status, created_at

ใช้ชื่อตารางและคอลัมน์ตามนี้เท่านั้นเมื่อเขียนโค้ดที่ query Supabase

## หน้าที่วางแผนไว้
- `/` หน้าแรก (ใช้ทดสอบว่า deploy สำเร็จ)
- `/generate-qr`
- `/kitchen`
- หน้าสั่งอาหาร (Dynamic Route) — ขั้นตอนถัดไป
