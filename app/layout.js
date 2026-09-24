export const metadata = {
  title: "omakase sushi",
  description: "ระบบสั่งอาหารร้านบุฟเฟต์ omakase sushi",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
