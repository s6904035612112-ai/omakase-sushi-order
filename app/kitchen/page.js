"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const STATUS_PENDING = "received"; // ออเดอร์ที่ลูกค้าเพิ่งส่งเข้ามา
const STATUS_DONE = "done"; // ครัวทำเสร็จแล้ว
const POLL_MS = 5000; // ดึงออเดอร์ใหม่ทุก 5 วินาที
const LATE_MINUTES = 10; // รอเกินนี้ให้ไฮไลต์สีแดง

function minutesSince(iso, now) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState([]);
  const [now, setNow] = useState(Date.now());

  const fetchOrders = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("id, table_number, items, status, created_at")
      .eq("status", STATUS_PENDING)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError("โหลดออเดอร์ไม่สำเร็จ: " + fetchError.message);
    } else {
      setError("");
      setOrders(data || []);
    }
    setLoaded(true);
  }, []);

  // ดึงข้อมูลครั้งแรก + ดึงซ้ำเป็นระยะ
  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, POLL_MS);
    return () => clearInterval(poll);
  }, [fetchOrders]);

  // อัปเดตเวลา "รอมาแล้ว N นาที" ทุก 30 วินาที
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(tick);
  }, []);

  async function markDone(id) {
    if (busyIds.includes(id)) return;
    setBusyIds((b) => [...b, id]);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: STATUS_DONE })
      .eq("id", id)
      .eq("status", STATUS_PENDING)
      .select("id");

    setBusyIds((b) => b.filter((x) => x !== id));

    if (updateError) {
      setError("อัปเดตออเดอร์ไม่สำเร็จ: " + updateError.message);
      return;
    }
    setOrders((list) => list.filter((o) => o.id !== id));
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <h1 style={s.title}>ครัว · omakase sushi</h1>
        <div style={s.count}>รอทำ {orders.length} ออเดอร์</div>
      </header>

      {error && <p style={s.error}>{error}</p>}

      {!loaded && <p style={s.empty}>กำลังโหลด...</p>}
      {loaded && orders.length === 0 && !error && (
        <p style={s.empty}>ไม่มีออเดอร์ค้าง 🎉</p>
      )}

      <div style={s.grid}>
        {orders.map((order) => {
          const waited = minutesSince(order.created_at, now);
          const late = waited >= LATE_MINUTES;
          const lines = Array.isArray(order.items) ? order.items : [];
          const busy = busyIds.includes(order.id);

          return (
            <section
              key={order.id}
              style={late ? { ...s.card, ...s.cardLate } : s.card}
            >
              <div style={s.cardHead}>
                <span style={s.table}>โต๊ะ {order.table_number}</span>
                <span style={late ? s.timeLate : s.time}>
                  {formatTime(order.created_at)} · รอ {waited} นาที
                </span>
              </div>

              <ul style={s.items}>
                {lines.map((line, i) => (
                  <li key={i} style={s.itemLine}>
                    <span>{line.name}</span>
                    <span style={s.qty}>× {line.quantity}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                style={busy ? { ...s.doneBtn, ...s.doneBtnBusy } : s.doneBtn}
                disabled={busy}
                onClick={() => markDone(order.id)}
              >
                {busy ? "กำลังบันทึก..." : "เสร็จแล้ว"}
              </button>
            </section>
          );
        })}
      </div>
    </main>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#1b1b1b",
    color: "#f5f5f5",
    fontFamily: "sans-serif",
    padding: "1rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1rem",
  },
  title: { margin: 0, fontSize: "2rem" },
  count: { fontSize: "1.6rem", fontWeight: 700, color: "#ffb74d" },
  error: {
    background: "#b71c1c",
    padding: "0.8rem 1rem",
    borderRadius: 8,
    fontSize: "1.1rem",
  },
  empty: { textAlign: "center", fontSize: "1.8rem", opacity: 0.7, marginTop: "4rem" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1rem",
    alignItems: "start",
  },
  card: {
    background: "#2a2a2a",
    border: "3px solid #444",
    borderRadius: 12,
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
  },
  cardLate: { borderColor: "#e53935", background: "#3a1f1f" },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  table: { fontSize: "2.2rem", fontWeight: 800 },
  time: { fontSize: "1.1rem", opacity: 0.8 },
  timeLate: { fontSize: "1.1rem", fontWeight: 700, color: "#ff8a80" },
  items: { listStyle: "none", margin: 0, padding: 0 },
  itemLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    fontSize: "1.5rem",
    padding: "0.4rem 0",
    borderBottom: "1px solid #444",
  },
  qty: { fontWeight: 800, color: "#ffb74d", whiteSpace: "nowrap" },
  doneBtn: {
    fontSize: "1.5rem",
    fontWeight: 700,
    padding: "0.9rem",
    border: "none",
    borderRadius: 10,
    background: "#2e7d32",
    color: "#fff",
    cursor: "pointer",
  },
  doneBtnBusy: { background: "#555", cursor: "not-allowed" },
};
