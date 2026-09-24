"use client";

import { use, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

const ADULT_PRICE = 289;
const CHILD_PRICE = 145;
const MAX_QTY_PER_ITEM = 5;
const MAX_ITEMS_PER_ORDER = 10;

export default function OrderPage({ params }) {
  // params เป็น Promise ต้อง unwrap ด้วย use() เสมอ
  const { tableNumber } = use(params);

  // phase: loading | not-open | error | ready | billed
  const [phase, setPhase] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [activeCat, setActiveCat] = useState(null);

  const [cart, setCart] = useState([]); // [{ id, name, quantity }]
  const [cartOpen, setCartOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: "ok" | "warn" | "error", text }

  const [showBill, setShowBill] = useState(false);
  const [billing, setBilling] = useState(false);
  const [billError, setBillError] = useState("");

  // ---------- โหลด session + เมนู ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const table = Number(tableNumber);
      if (!Number.isInteger(table) || table < 1) {
        setPhase("not-open");
        return;
      }

      const { data: rows, error: sessionError } = await supabase
        .from("sessions")
        .select("id, adult_count, child_count")
        .eq("table_number", table)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;
      if (sessionError) {
        setLoadError(sessionError.message);
        setPhase("error");
        return;
      }
      if (!rows || rows.length === 0) {
        setPhase("not-open");
        return;
      }

      const [catRes, itemRes] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name, sort_order")
          .order("sort_order", { ascending: true }),
        supabase
          .from("menu_items")
          .select("id, category_id, name")
          .order("id", { ascending: true }),
      ]);

      if (cancelled) return;
      if (catRes.error || itemRes.error) {
        setLoadError((catRes.error || itemRes.error).message);
        setPhase("error");
        return;
      }

      setSession(rows[0]);
      setCategories(catRes.data || []);
      setItems(itemRes.data || []);
      setActiveCat(catRes.data && catRes.data.length ? catRes.data[0].id : null);
      setPhase("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tableNumber]);

  // ข้อความแจ้งเตือนเล็ก ๆ หายเองใน 2.5 วินาที
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2500);
    return () => clearTimeout(t);
  }, [notice]);

  const visibleItems = useMemo(
    () => items.filter((i) => i.category_id === activeCat),
    [items, activeCat]
  );

  // ---------- ตะกร้า ----------
  function addItem(item) {
    const line = cart.find((c) => c.id === item.id);
    if (line) {
      if (line.quantity >= MAX_QTY_PER_ITEM) {
        setNotice({
          kind: "warn",
          text: `สั่งได้สูงสุด ${MAX_QTY_PER_ITEM} จานต่อรายการ`,
        });
        return;
      }
      setCart(
        cart.map((c) =>
          c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
      return;
    }
    if (cart.length >= MAX_ITEMS_PER_ORDER) {
      setNotice({
        kind: "warn",
        text: `ส่งได้สูงสุด ${MAX_ITEMS_PER_ORDER} รายการต่อครั้ง`,
      });
      return;
    }
    setCart([...cart, { id: item.id, name: item.name, quantity: 1 }]);
  }

  function changeQty(id, delta) {
    setCart(
      cart
        .map((c) =>
          c.id === id
            ? { ...c, quantity: Math.min(MAX_QTY_PER_ITEM, c.quantity + delta) }
            : c
        )
        .filter((c) => c.quantity > 0)
    );
  }

  async function submitOrder() {
    if (sending || cart.length === 0) return;
    setSending(true);

    const { error } = await supabase.from("orders").insert({
      session_id: session.id,
      table_number: Number(tableNumber),
      items: cart.map(({ name, quantity }) => ({ name, quantity })),
      status: "received",
    });

    setSending(false);

    if (error) {
      console.error(error);
      setNotice({ kind: "error", text: "ส่งออเดอร์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" });
      return;
    }

    setCart([]);
    setCartOpen(false);
    setNotice({ kind: "ok", text: "ส่งออเดอร์แล้ว ✓" });
  }

  // ---------- เรียกเก็บเงิน ----------
  async function confirmBill() {
    if (billing || !session) return;
    setBilling(true);
    setBillError("");

    const { error } = await supabase
      .from("sessions")
      .update({ status: "closed" })
      .eq("id", session.id)
      .eq("status", "open")
      .select("id");

    setBilling(false);

    if (error) {
      console.error(error);
      setBillError("เรียกเก็บเงินไม่สำเร็จ กรุณาลองใหม่หรือแจ้งพนักงาน");
      return;
    }

    setShowBill(false);
    setCart([]);
    setPhase("billed");
  }

  // ---------- หน้าเต็มจอตามสถานะ ----------
  if (phase === "loading") {
    return <FullScreen text="กำลังโหลด..." />;
  }
  if (phase === "not-open") {
    return <FullScreen text="โต๊ะนี้ยังไม่เปิดใช้งาน กรุณาแจ้งพนักงาน" />;
  }
  if (phase === "error") {
    return (
      <FullScreen
        text="โหลดข้อมูลไม่สำเร็จ กรุณาแจ้งพนักงาน"
        sub={loadError}
      />
    );
  }
  if (phase === "billed") {
    return <FullScreen text="ขอบคุณที่ใช้บริการ" emoji="🙏" />;
  }

  // ---------- หน้าสั่งอาหาร ----------
  const totalLines = cart.length;
  const adultTotal = session.adult_count * ADULT_PRICE;
  const childTotal = session.child_count * CHILD_PRICE;
  const grandTotal = adultTotal + childTotal;

  return (
    <div style={s.page}>
      {/* หัวหน้า */}
      <header style={s.header}>
        <div>
          <div style={s.brand}>omakase sushi</div>
          <div style={s.tableLabel}>โต๊ะ {tableNumber}</div>
        </div>
        <button type="button" style={s.billBtn} onClick={() => setShowBill(true)}>
          เรียกเก็บเงิน
        </button>
      </header>

      {/* แท็บหมวดหมู่ */}
      <nav style={s.tabs}>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setActiveCat(c.id)}
            style={c.id === activeCat ? { ...s.tab, ...s.tabActive } : s.tab}
          >
            {c.name}
          </button>
        ))}
      </nav>

      {/* รายการเมนู */}
      <main style={s.list}>
        {visibleItems.length === 0 && (
          <p style={s.empty}>ยังไม่มีเมนูในหมวดนี้</p>
        )}
        {visibleItems.map((item) => {
          const line = cart.find((c) => c.id === item.id);
          return (
            <div key={item.id} style={s.itemRow}>
              <div style={s.itemName}>
                {item.name}
                {line && <span style={s.itemBadge}>× {line.quantity}</span>}
              </div>
              <button
                type="button"
                style={s.addBtn}
                onClick={() => addItem(item)}
                aria-label={`เพิ่ม ${item.name}`}
              >
                +
              </button>
            </div>
          );
        })}
      </main>

      {/* แจ้งเตือนเล็ก ๆ */}
      {notice && (
        <div
          style={{
            ...s.toast,
            background:
              notice.kind === "ok"
                ? "#2e7d32"
                : notice.kind === "error"
                ? "#b71c1c"
                : "#ef6c00",
          }}
          role="status"
        >
          {notice.text}
        </div>
      )}

      {/* ตะกร้าลอยด้านล่าง */}
      <div style={s.cartWrap}>
        {cartOpen && cart.length > 0 && (
          <div style={s.cartPanel}>
            {cart.map((c) => (
              <div key={c.id} style={s.cartLine}>
                <span style={s.cartName}>{c.name}</span>
                <div style={s.stepper}>
                  <button
                    type="button"
                    style={s.stepBtn}
                    onClick={() => changeQty(c.id, -1)}
                    aria-label={`ลด ${c.name}`}
                  >
                    −
                  </button>
                  <span style={s.stepQty}>{c.quantity}</span>
                  <button
                    type="button"
                    style={s.stepBtn}
                    onClick={() => changeQty(c.id, 1)}
                    aria-label={`เพิ่ม ${c.name}`}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={s.cartBar}>
          <button
            type="button"
            style={s.cartInfo}
            onClick={() => cart.length > 0 && setCartOpen((o) => !o)}
          >
            <span style={s.cartCount}>
              🛒 {totalLines}/{MAX_ITEMS_PER_ORDER} รายการ
            </span>
            {cart.length > 0 && (
              <span style={s.cartHint}>{cartOpen ? "ซ่อนรายการ ▼" : "ดู/แก้ไข ▲"}</span>
            )}
          </button>
          <button
            type="button"
            style={
              cart.length === 0 || sending
                ? { ...s.sendBtn, ...s.sendBtnDisabled }
                : s.sendBtn
            }
            disabled={cart.length === 0 || sending}
            onClick={submitOrder}
          >
            {sending ? "กำลังส่ง..." : "ส่งออเดอร์"}
          </button>
        </div>
      </div>

      {/* หน้าต่างยืนยันเรียกเก็บเงิน */}
      {showBill && (
        <div style={s.overlay} role="dialog" aria-modal="true">
          <div style={s.dialog}>
            <h2 style={s.dialogTitle}>เรียกเก็บเงิน</h2>
            <p style={s.dialogLine}>
              ผู้ใหญ่ {session.adult_count} × {ADULT_PRICE} ={" "}
              {adultTotal.toLocaleString()} บาท
            </p>
            <p style={s.dialogLine}>
              เด็ก {session.child_count} × {CHILD_PRICE} ={" "}
              {childTotal.toLocaleString()} บาท
            </p>
            <p style={s.total}>ยอดที่ต้องจ่าย {grandTotal.toLocaleString()} บาท</p>
            <p style={s.dialogNote}>
              เมื่อยืนยันแล้วจะไม่สามารถสั่งอาหารเพิ่มได้
            </p>
            {billError && <p style={s.errorText}>{billError}</p>}
            <div style={s.dialogActions}>
              <button
                type="button"
                style={s.cancelBtn}
                disabled={billing}
                onClick={() => {
                  setShowBill(false);
                  setBillError("");
                }}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                style={s.confirmBtn}
                disabled={billing}
                onClick={confirmBill}
              >
                {billing ? "กำลังดำเนินการ..." : "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FullScreen({ text, sub, emoji }) {
  return (
    <div style={s.full}>
      {emoji && <div style={{ fontSize: "4rem" }}>{emoji}</div>}
      <p style={s.fullText}>{text}</p>
      {sub && <p style={s.fullSub}>{sub}</p>}
    </div>
  );
}

const INK = "#2b1d14";
const RED = "#b71c1c";
const PAPER = "#faf5ea";

const s = {
  page: {
    minHeight: "100vh",
    background: PAPER,
    color: INK,
    fontFamily: "'Noto Serif Thai', Georgia, serif",
    paddingBottom: 190,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.75rem 1rem",
    background: INK,
    color: PAPER,
  },
  brand: { fontSize: "1.3rem", fontWeight: 700, letterSpacing: "0.05em" },
  tableLabel: { fontSize: "1rem", opacity: 0.85 },
  billBtn: {
    fontSize: "1rem",
    fontWeight: 700,
    padding: "0.7rem 1rem",
    border: "2px solid " + PAPER,
    borderRadius: 999,
    background: "transparent",
    color: PAPER,
    cursor: "pointer",
  },
  tabs: {
    position: "sticky",
    top: 64,
    zIndex: 10,
    display: "flex",
    gap: "0.5rem",
    overflowX: "auto",
    padding: "0.75rem 1rem",
    background: PAPER,
    borderBottom: "1px solid #d9ccb3",
  },
  tab: {
    flex: "0 0 auto",
    fontSize: "1.1rem",
    padding: "0.7rem 1.2rem",
    border: "2px solid " + INK,
    borderRadius: 999,
    background: "transparent",
    color: INK,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabActive: { background: RED, borderColor: RED, color: "#fff", fontWeight: 700 },
  list: { padding: "0.5rem 1rem" },
  empty: { textAlign: "center", padding: "2rem 0", opacity: 0.7 },
  itemRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    padding: "1rem 0",
    borderBottom: "1px dashed #c9b998",
  },
  itemName: { fontSize: "1.3rem", flex: 1 },
  itemBadge: {
    marginLeft: "0.6rem",
    fontSize: "1rem",
    fontWeight: 700,
    color: RED,
  },
  addBtn: {
    flex: "0 0 auto",
    width: 56,
    height: 56,
    borderRadius: "50%",
    border: "none",
    background: RED,
    color: "#fff",
    fontSize: "2rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  toast: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    bottom: 100,
    zIndex: 40,
    padding: "0.8rem 1.4rem",
    borderRadius: 999,
    color: "#fff",
    fontSize: "1.1rem",
    fontWeight: 700,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    maxWidth: "90%",
    textAlign: "center",
  },
  cartWrap: {
    position: "fixed",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
  },
  cartPanel: {
    maxHeight: "40vh",
    overflowY: "auto",
    background: "#fff",
    borderTop: "2px solid " + INK,
    padding: "0.5rem 1rem",
  },
  cartLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "0.8rem",
    padding: "0.5rem 0",
    borderBottom: "1px solid #eee",
  },
  cartName: { fontSize: "1.15rem", flex: 1 },
  stepper: { display: "flex", alignItems: "center", gap: "0.6rem" },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "2px solid " + INK,
    background: "#fff",
    fontSize: "1.5rem",
    lineHeight: 1,
    cursor: "pointer",
  },
  stepQty: { minWidth: 24, textAlign: "center", fontSize: "1.2rem", fontWeight: 700 },
  cartBar: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.75rem 1rem calc(0.75rem + env(safe-area-inset-bottom, 0px))",
    background: INK,
    color: PAPER,
  },
  cartInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 2,
    background: "transparent",
    border: "none",
    color: PAPER,
    cursor: "pointer",
    textAlign: "left",
    padding: 0,
  },
  cartCount: { fontSize: "1.2rem", fontWeight: 700 },
  cartHint: { fontSize: "0.9rem", opacity: 0.8 },
  sendBtn: {
    flex: "0 0 auto",
    fontSize: "1.3rem",
    fontWeight: 700,
    padding: "0.9rem 1.4rem",
    border: "none",
    borderRadius: 12,
    background: RED,
    color: "#fff",
    cursor: "pointer",
  },
  sendBtnDisabled: { background: "#6b5b50", cursor: "not-allowed" },
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 50,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
  },
  dialog: {
    width: "100%",
    maxWidth: 440,
    background: PAPER,
    borderRadius: 16,
    padding: "1.5rem",
  },
  dialogTitle: { margin: "0 0 1rem", fontSize: "1.8rem" },
  dialogLine: { margin: "0 0 0.4rem", fontSize: "1.2rem" },
  total: { margin: "1rem 0 0.5rem", fontSize: "1.7rem", fontWeight: 700, color: RED },
  dialogNote: { margin: "0 0 0.5rem", fontSize: "1rem", opacity: 0.75 },
  errorText: { color: RED, fontWeight: 700 },
  dialogActions: { display: "flex", gap: "0.75rem", marginTop: "1rem" },
  cancelBtn: {
    flex: 1,
    fontSize: "1.2rem",
    padding: "1rem",
    border: "2px solid " + INK,
    borderRadius: 12,
    background: "transparent",
    cursor: "pointer",
  },
  confirmBtn: {
    flex: 1,
    fontSize: "1.2rem",
    fontWeight: 700,
    padding: "1rem",
    border: "none",
    borderRadius: 12,
    background: RED,
    color: "#fff",
    cursor: "pointer",
  },
  full: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem",
    textAlign: "center",
    background: PAPER,
    color: INK,
    fontFamily: "'Noto Serif Thai', Georgia, serif",
  },
  fullText: { fontSize: "2rem", fontWeight: 700, margin: 0, lineHeight: 1.4 },
  fullSub: { fontSize: "0.9rem", opacity: 0.6, marginTop: "1rem" },
};
