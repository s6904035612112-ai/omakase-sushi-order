import React from 'react';
import Link from 'next/link';

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9f6f0',
    backgroundImage: `radial-gradient(#e0dcd3 1px, transparent 1px), radial-gradient(#e0dcd3 1px, #f9f6f0 1px)`,
    backgroundSize: '40px 40px',
    backgroundPosition: '0 0, 20px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 16px',
    fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif, system-ui',
    color: '#2b2b2b',
  },
  card: {
    backgroundColor: '#fffdf9',
    width: '100%',
    maxWidth: '680px',
    borderRadius: '16px',
    border: '3px solid #b8332a',
    boxShadow: '0 20px 40px rgba(184, 51, 42, 0.08), 0 8px 16px rgba(0, 0, 0, 0.04)',
    padding: '40px 28px',
    position: 'relative',
    textAlign: 'center',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  hankoContainer: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hankoStamp: {
    border: '2px solid #b8332a',
    borderRadius: '6px',
    color: '#b8332a',
    padding: '4px 8px',
    fontWeight: 'bold',
    fontSize: '12px',
    letterSpacing: '2px',
    transform: 'rotate(-8deg)',
    backgroundColor: 'rgba(184, 51, 42, 0.04)',
    boxShadow: 'inset 0 0 4px rgba(184, 51, 42, 0.1)',
    userSelect: 'none',
  },
  subHeader: {
    fontSize: '14px',
    color: '#7a6a58',
    letterSpacing: '4px',
    textTransform: 'uppercase',
    marginBottom: '8px',
    fontWeight: '600',
  },
  title: {
    fontSize: '36px',
    fontWeight: '800',
    color: '#b8332a',
    margin: '0 0 12px 0',
    letterSpacing: '2px',
    lineHeight: '1.2',
  },
  japaneseSubtitle: {
    fontSize: '18px',
    color: '#2d4a3e',
    margin: '0 0 20px 0',
    fontWeight: '500',
    letterSpacing: '6px',
  },
  divider: {
    width: '60px',
    height: '2px',
    backgroundColor: '#b8332a',
    margin: '0 auto 24px auto',
    borderRadius: '2px',
  },
  description: {
    fontSize: '15px',
    lineHeight: '1.7',
    color: '#554d45',
    marginBottom: '36px',
    maxWidth: '500px',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  buttonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '20px',
    width: '100%',
  },
  btn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px 20px',
    borderRadius: '12px',
    textDecoration: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    cursor: 'pointer',
    border: 'none',
    outline: 'none',
  },
  btnQr: {
    backgroundColor: '#b8332a',
    color: '#ffffff',
    boxShadow: '0 8px 20px rgba(184, 51, 42, 0.25)',
  },
  btnKitchen: {
    backgroundColor: '#2d4a3e',
    color: '#ffffff',
    boxShadow: '0 8px 20px rgba(45, 74, 62, 0.25)',
  },
  btnIcon: {
    fontSize: '32px',
    marginBottom: '10px',
  },
  btnTitle: {
    fontSize: '18px',
    fontWeight: '700',
    marginBottom: '6px',
    letterSpacing: '1px',
  },
  btnSub: {
    fontSize: '12px',
    opacity: 0.85,
    fontWeight: '400',
  },
  footerText: {
    marginTop: '32px',
    fontSize: '12px',
    color: '#a09383',
    letterSpacing: '1px',
  }
};

export default function HomePage() {
  return (
{/* Japanese Traditional Hanko Stamp Badge */}

御注文

{/* Main Header & Title */}

ORDERING SYSTEM

omakase sushi
おまかせ寿司

{/* System Description */}

ยินดีต้อนรับสู่ระบบสั่งอาหารบุฟเฟต์ซูชิ


กรุณาเลือกเมนูการใช้งานด้านล่างเพื่อเริ่มดำเนินการ

{/* Big Action Buttons */}

{/* Button 1: QR Generator */}

📱
เปิดโต๊ะ / ออก QR Code
สำหรับพนักงาน (Generate QR Code)

{/* Button 2: Kitchen Display */}

👨‍🍳
ระบบห้องครัว Realtime
สำหรับเชฟ (Kitchen Display System)

{/* Decorative Footer */}

高級寿司ビュッフェ • Premium Sushi Buffet System

);
}
