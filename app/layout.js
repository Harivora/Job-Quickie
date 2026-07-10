import "./globals.css";

export const metadata = {
  title: "JobQuickie — Find Jobs. Faster.",
  description:
    "Live remote, hybrid and on-site job listings aggregated from multiple sources.",
  icons: { icon: "/logo.svg" },
};

// Apply the saved (or system) theme before first paint to avoid flashing.
const themeInit = `
try {
  var t = localStorage.getItem("jq_theme");
  if (t !== "light" && t !== "dark") {
    t = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  document.documentElement.dataset.theme = t;
} catch (e) { document.documentElement.dataset.theme = "dark"; }
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
