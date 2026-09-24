"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

// ออเดอร์ที่ยังต้องแสดงบนจอครัว
const ACTIVE_STATUSES = ["received", "cooking"];

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function sortByCreatedAsc(list) {
  return [...list].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  );
}

export default function KitchenPage() {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busyIds, setBusyIds] = useState([]);

  // ---------- โหลดออเดอร์ครั้งแรก ----------
  const fetchOrders = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("id, table_number, items, status, created_at")
      .in("status", ACTIVE_STATUSES)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError("โหลดออเดอร์ไม่สำเร็จ: " + fetchError.message);
    } else {
      setError("");
      setOrders(data || []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ---------- Realtime: ฟัง INSERT / UPDATE บนตาราง orders ----------
  useEffect(() => {
    const channel = supabase
      .channel("kitchen-orders")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new;
          if (!ACTIVE_STATUSES.includes(row.status)) return;
          setOrders((list) => {
            if (list.some((o) => o.id === row.id)) return list;
            return sortByCreatedAsc([...list, row]);
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          const row = payload.new;
          setOrders((list) => {
            if (!ACTIVE_STATUSES.includes(row.status)) {
              // เสิร์ฟแล้ว / ยกเลิก ฯลฯ -> เอาออกจากจอ
              return list.filter((o) => o.id !== row.id);
            }
            if (list.some((o) => o.id === row.id)) {
              return list.map((o) => (o.id === row.id ? row : o));
            }
            return sortByCreatedAsc([...list, row]);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ---------- อัปเดตสถานะออเดอร์ ----------
  async function updateStatus(id, currentStatus, nextStatus) {
    if (busyIds.includes(id)) return;
    setBusyIds((b) => [...b, id]);

    const { error: updateError } = await supabase
      .from("orders")
      .update({ status: nextStatus })
      .eq("id", id)
      .eq("status", currentStatus) // กันกดซ้ำ/กันชนกับ event อื่น
      .select("id");

    setBusyIds((b) => b.filter((x) => x !== id));

    if (updateError) {
      setError("อัปเดตออเดอร์ไม่สำเร็จ: " + updateError.message);
      return;
    }

    // อัปเดตหน้าจอทันที ไม่ต้องรอ realtime event ย้อนกลับมา
    setOrders((list) => {
      if (nextStatus === "served") {
        return list.filter((o) => o.id !== id);
      }
      return list.map((o) =>
        o.id === id ? { ...o, status: nextStatus } : o
      );
    });
  }

  return (
    <main style={s.page}>
      <header style={s.header}>
        <h1 style={s.title}>หน้าจอครัว</h1>
        <div style={s.count}>{orders.length} ออเดอร์</div>
      </header>

      {error && <p style={s.error}>{error}</p>}
      {!loaded && <p style={s.empty}>กำลังโหลด...</p>}
      {loaded && orders.length === 0 && !error && (
        <p style={s.empty}>ไม่มีออเดอร์ค้าง 🎉</p>
      )}

      <div style={s.grid}>
        {orders.map((order) => {
          const cooking = order.status === "cooking";
          const lines = Array.isArray(order.items) ? order.items : [];
          const busy = busyIds.includes(order.id);

          return (
            <section
              key={order.id}
              style={cooking ? { ...s.card, ...s.cardCooking } : s.card}
            >
              <div style={s.cardHead}>
                <span style={s.table}>โต๊ะ {order.table_number}</span>
                <span style={s.time}>{formatTime(order.created_at)}</span>
              </div>

              {cooking && <div style={s.badge}>กำลังทำ</div>}

              <ul style={s.items}>
                {lines.map((line, i) => (
                  <li key={i} style={s.itemLine}>
                    <span>{line.name}</span>
                    <span style={s.qty}>× {line.quantity}</span>
                  </li>
                ))}
              </ul>

              <div style={s.actions}>
                {!cooking && (
                  <button
                    type="button"
                    style={
                      busy ? { ...s.startBtn, ...s.btnBusy } : s.startBtn
                    }
                    disabled={busy}
                    onClick={() =>
                      updateStatus(order.id, "received", "cooking")
                    }
                  >
                    {busy ? "กำลังบันทึก..." : "เริ่มทำ"}
                  </button>
                )}
                <button
                  type="button"
                  style={busy ? { ...s.serveBtn, ...s.btnBusy } : s.serveBtn}
                  disabled={busy}
                  onClick={() =>
                    updateStatus(order.id, order.status, "served")
                  }
                >
                  {busy ? "กำลังบันทึก..." : "จัดเสิร์ฟแล้ว"}
                </button>
              </div>
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
    background: "#161616",
    color: "#f5f5f5",
    fontFamily: "sans-serif",
    padding: "1.25rem",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1.25rem",
  },
  title: { margin: 0, fontSize: "2.2rem" },
  count: { fontSize: "1.8rem", fontWeight: 800, color: "#4fc3f7" },
  error: {
    background: "#b71c1c",
    padding: "0.8rem 1rem",
    borderRadius: 8,
    fontSize: "1.2rem",
    marginBottom: "1rem",
  },
  empty: {
    textAlign: "center",
    fontSize: "2rem",
    opacity: 0.7,
    marginTop: "4rem",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
    gap: "1.25rem",
    alignItems: "start",
  },
  card: {
    background: "#242424",
    border: "4px solid #3a4a5a",
    borderRadius: 14,
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.9rem",
  },
  cardCooking: { borderColor: "#ff9800", background: "#3a2c12" },
  cardHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "0.5rem",
    flexWrap: "wrap",
  },
  table: { fontSize: "2.6rem", fontWeight: 900, lineHeight: 1 },
  time: { fontSize: "1.3rem", opacity: 0.85 },
  badge: {
    alignSelf: "flex-start",
    fontSize: "1.1rem",
    fontWeight: 800,
    color: "#ff9800",
    border: "2px solid #ff9800",
    borderRadius: 999,
    padding: "0.2rem 0.9rem",
  },
  items: { listStyle: "none", margin: 0, padding: 0 },
  itemLine: {
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    fontSize: "1.6rem",
    padding: "0.45rem 0",
    borderBottom: "1px solid #444",
  },
  qty: { fontWeight: 800, color: "#4fc3f7", whiteSpace: "nowrap" },
  actions: { display: "flex", gap: "0.75rem", marginTop: "0.25rem" },
  startBtn: {
    flex: 1,
    fontSize: "1.4rem",
    fontWeight: 700,
    padding: "0.9rem",
    border: "none",
    borderRadius: 10,
    background: "#ff9800",
    color: "#1a1a1a",
    cursor: "pointer",
  },
  serveBtn: {
    flex: 1,
    fontSize: "1.4rem",
    fontWeight: 700,
    padding: "0.9rem",
    border: "none",
    borderRadius: 10,
    background: "#2e7d32",
    color: "#fff",
    cursor: "pointer",
  },
  btnBusy: { background: "#555", color: "#ccc", cursor: "not-allowed" },
};
