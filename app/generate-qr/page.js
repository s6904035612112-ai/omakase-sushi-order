"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

const EMPTY_FORM = { table: "", adults: "", children: "0" };

function minutesSince(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export default function GenerateQrPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // session เก่าที่เปิดค้างอยู่ (ถ้ามี) -> แสดงกล่องเตือน
  const [existing, setExisting] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [minutesOpen, setMinutesOpen] = useState(0);

  // ผลลัพธ์หลังสร้าง session ใหม่สำเร็จ
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
    setError("");
    // เปลี่ยนเลขโต๊ะแล้ว กล่องเตือนเดิมไม่เกี่ยวข้องอีก
    if (name === "table") {
      setExisting(null);
      setShowConfirm(false);
    }
  }

  function parseForm() {
    const table = Number(form.table);
    const adults = Number(form.adults);
    const children = Number(form.children === "" ? 0 : form.children);

    if (!Number.isInteger(table) || table < 1) {
      return { error: "กรุณากรอกเลขโต๊ะให้ถูกต้อง" };
    }
    if (!Number.isInteger(adults) || adults < 0) {
      return { error: "กรุณากรอกจำนวนผู้ใหญ่ให้ถูกต้อง" };
    }
    if (!Number.isInteger(children) || children < 0) {
      return { error: "กรุณากรอกจำนวนเด็กให้ถูกต้อง" };
    }
    if (adults + children < 1) {
      return { error: "ต้องมีลูกค้าอย่างน้อย 1 คน" };
    }
    return { table, adults, children };
  }

  async function handleOpenTable(e) {
    e.preventDefault();
    if (loading) return;

    const parsed = parseForm();
    if (parsed.error) {
      setError(parsed.error);
      return;
    }

    setLoading(true);
    setError("");

    // 1) เช็คว่าโต๊ะนี้มี session เปิดค้างอยู่หรือไม่
    const { data: openRows, error: checkError } = await supabase
      .from("sessions")
      .select("id, adult_count, child_count, created_at")
      .eq("table_number", parsed.table)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(1);

    if (checkError) {
      setError("ตรวจสอบโต๊ะไม่สำเร็จ: " + checkError.message);
      setLoading(false);
      return;
    }

    if (openRows && openRows.length > 0) {
      setExisting({ ...openRows[0], table_number: parsed.table });
      setLoading(false);
      return;
    }

    // 2) ไม่มี -> สร้าง session ใหม่
    const { error: insertError } = await supabase.from("sessions").insert({
      table_number: parsed.table,
      adult_count: parsed.adults,
      child_count: parsed.children,
      status: "open",
    });

    if (insertError) {
      setError("เปิดโต๊ะไม่สำเร็จ: " + insertError.message);
      setLoading(false);
      return;
    }

    setResult({
      table: parsed.table,
      adults: parsed.adults,
      children: parsed.children,
      url: `${window.location.origin}/order/${parsed.table}`,
    });
    setCopied(false);
    setLoading(false);
  }

  function openConfirm() {
    setMinutesOpen(minutesSince(existing.created_at));
    setShowConfirm(true);
  }

  async function handleConfirmClose() {
    if (loading || !existing) return;
    setLoading(true);
    setError("");

    // update เฉพาะแถวนี้ และเฉพาะที่ยัง open อยู่ (กันกดซ้ำซ้อน)
    const { error: closeError } = await supabase
      .from("sessions")
      .update({ status: "closed" })
      .eq("id", existing.id)
      .eq("status", "open")
      .select("id");

    if (closeError) {
      setError("ปิดโต๊ะเดิมไม่สำเร็จ: " + closeError.message);
      setLoading(false);
      return;
    }

    // ปิดสำเร็จ (หรือมีคนปิดไปแล้ว) -> กลับไปฟอร์มเดิม ให้พนักงานกดเปิดโต๊ะใหม่เอง
    setShowConfirm(false);
    setExisting(null);
    setLoading(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("คัดลอกไม่สำเร็จ กรุณาคัดลอกลิงก์ด้วยตนเอง");
    }
  }

  function handleReset() {
    setForm(EMPTY_FORM);
    setResult(null);
    setExisting(null);
    setShowConfirm(false);
    setError("");
    setCopied(false);
  }

  // ---------- หน้าแสดง QR ----------
  if (result) {
    const qrSrc =
      "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=" +
      encodeURIComponent(result.url);

    return (
      <main style={styles.page}>
        <h1 style={styles.title}>เปิดโต๊ะสำเร็จ</h1>
        <div style={{ ...styles.card, textAlign: "center" }}>
          <img
            src={qrSrc}
            alt={`QR Code โต๊ะ ${result.table}`}
            width={300}
            height={300}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <p style={styles.summary}>
            โต๊ะ {result.table} · ผู้ใหญ่ {result.adults} · เด็ก{" "}
            {result.children}
          </p>
          <p style={styles.urlRow}>
            <span style={styles.urlText}>{result.url}</span>
            <button type="button" onClick={handleCopy} style={styles.smallBtn}>
              {copied ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
            </button>
          </p>
          {error && <p style={styles.error}>{error}</p>}
          <button type="button" onClick={handleReset} style={styles.primaryBtn}>
            เปิดโต๊ะใหม่
          </button>
        </div>
      </main>
    );
  }

  // ---------- หน้าฟอร์ม ----------
  return (
    <main style={styles.page}>
      <h1 style={styles.title}>เปิดโต๊ะ</h1>

      {existing && (
        <div style={styles.warnBox} role="alert">
          <p style={styles.warnText}>
            ⚠️ โต๊ะนี้มีลูกค้าอยู่ระหว่างทานอาหาร กรุณาปิดออเดอร์เดิมก่อน
          </p>
          <button type="button" onClick={openConfirm} style={styles.warnBtn}>
            ปิดออเดอร์เดิม
          </button>
        </div>
      )}

      <form onSubmit={handleOpenTable} style={styles.card}>
        <label style={styles.label}>
          เลขโต๊ะ
          <input
            type="number"
            inputMode="numeric"
            min="1"
            value={form.table}
            onChange={(e) => updateField("table", e.target.value)}
            style={styles.input}
            required
          />
        </label>
        <label style={styles.label}>
          จำนวนผู้ใหญ่
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={form.adults}
            onChange={(e) => updateField("adults", e.target.value)}
            style={styles.input}
            required
          />
        </label>
        <label style={styles.label}>
          จำนวนเด็ก
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={form.children}
            onChange={(e) => updateField("children", e.target.value)}
            style={styles.input}
          />
        </label>

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={loading} style={styles.primaryBtn}>
          {loading && !showConfirm ? "กำลังตรวจสอบ..." : "เปิดโต๊ะ"}
        </button>
      </form>

      {/* กล่องยืนยันปิดโต๊ะเดิม */}
      {showConfirm && existing && (
        <div style={styles.overlay} role="dialog" aria-modal="true">
          <div style={styles.dialog}>
            <h2 style={styles.dialogTitle}>ยืนยันปิดโต๊ะเดิม?</h2>
            <p style={styles.dialogLine}>โต๊ะ {existing.table_number}</p>
            <p style={styles.dialogLine}>
              ผู้ใหญ่ {existing.adult_count} · เด็ก {existing.child_count}
            </p>
            <p style={styles.dialogLine}>เปิดมาแล้ว {minutesOpen} นาที</p>
            {error && <p style={styles.error}>{error}</p>}
            <div style={styles.dialogActions}>
              <button
                type="button"
                onClick={() => {
                  setShowConfirm(false);
                  setError("");
                }}
                disabled={loading}
                style={styles.cancelBtn}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={loading}
                style={styles.dangerBtn}
              >
                {loading ? "กำลังปิด..." : "ยืนยันปิดโต๊ะเดิม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

const styles = {
  page: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "1.5rem 1rem 3rem",
    fontFamily: "sans-serif",
    fontSize: "1.25rem",
  },
  title: { fontSize: "2.25rem", margin: "0 0 1rem" },
  card: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    padding: "1.25rem",
    border: "2px solid #ddd",
    borderRadius: 12,
    background: "#fff",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    fontWeight: 600,
    fontSize: "1.4rem",
  },
  input: {
    fontSize: "2rem",
    padding: "0.6rem 0.8rem",
    border: "2px solid #999",
    borderRadius: 8,
  },
  primaryBtn: {
    fontSize: "1.75rem",
    fontWeight: 700,
    padding: "1rem",
    border: "none",
    borderRadius: 10,
    background: "#111",
    color: "#fff",
    cursor: "pointer",
  },
  smallBtn: {
    fontSize: "1rem",
    padding: "0.4rem 0.8rem",
    border: "2px solid #111",
    borderRadius: 8,
    background: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  error: { color: "#b00020", fontWeight: 600, margin: 0 },
  summary: { fontSize: "1.6rem", fontWeight: 700, margin: 0 },
  urlRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "0.6rem",
    margin: 0,
  },
  urlText: { fontSize: "1.1rem", wordBreak: "break-all" },
  warnBox: {
    background: "#fff3e0",
    border: "3px solid #e65100",
    borderRadius: 12,
    padding: "1rem 1.25rem",
    marginBottom: "1.25rem",
  },
  warnText: {
    color: "#b23c00",
    fontWeight: 700,
    fontSize: "1.4rem",
    margin: "0 0 0.8rem",
  },
  warnBtn: {
    fontSize: "1.4rem",
    fontWeight: 700,
    padding: "0.8rem 1.2rem",
    border: "none",
    borderRadius: 10,
    background: "#e65100",
    color: "#fff",
    cursor: "pointer",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1rem",
    zIndex: 1000,
  },
  dialog: {
    width: "100%",
    maxWidth: 460,
    background: "#fff",
    border: "4px solid #c62828",
    borderRadius: 14,
    padding: "1.5rem",
  },
  dialogTitle: { color: "#c62828", fontSize: "1.9rem", margin: "0 0 1rem" },
  dialogLine: { fontSize: "1.5rem", margin: "0 0 0.5rem" },
  dialogActions: {
    display: "flex",
    gap: "0.8rem",
    marginTop: "1.25rem",
    flexWrap: "wrap",
  },
  cancelBtn: {
    flex: 1,
    fontSize: "1.4rem",
    padding: "0.9rem",
    border: "2px solid #555",
    borderRadius: 10,
    background: "#fff",
    cursor: "pointer",
  },
  dangerBtn: {
    flex: 1,
    fontSize: "1.4rem",
    fontWeight: 700,
    padding: "0.9rem",
    border: "none",
    borderRadius: 10,
    background: "#c62828",
    color: "#fff",
    cursor: "pointer",
  },
};
