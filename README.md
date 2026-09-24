# omakase sushi

ระบบสั่งอาหารร้านบุฟเฟต์ — Next.js (App Router, JavaScript) + Supabase, deploy บน Vercel

## เริ่มใช้งาน
```bash
npm install
cp .env.local.example .env.local   # แล้วใส่ค่า Supabase จริง
npm run dev
```

## Deploy บน Vercel
ตั้งค่า Environment Variables ใน Vercel Project Settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

ดูกติกาของโปรเจกต์ (เช่น การใช้ `use(params)`) และโครงสร้างตารางใน `CLAUDE.md`
