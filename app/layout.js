import "./globals.css";

export const metadata = {
  title: "JobQuickie — Find Jobs. Faster.",
  description:
    "Live remote, hybrid and on-site job listings aggregated from multiple sources.",
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
