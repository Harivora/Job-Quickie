import "./globals.css";

export const metadata = {
  title: "Job Quickie — Live Job Market Monitor",
  description:
    "Live remote, hybrid and on-site job listings aggregated from multiple sources.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
