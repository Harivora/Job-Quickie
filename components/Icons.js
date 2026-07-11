"use client";

// Compact inline SVG icon set (stroke = currentColor) — replaces emojis.
const P = {
  zap: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.7 2.6 4 5.7 4 9s-1.3 6.4-4 9c-2.7-2.6-4-5.7-4-9s1.3-6.4 4-9Z" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>
  ),
  star: <path d="m12 3 2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7L12 3Z" />,
  sparkle: <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3ZM19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" />,
  flame: <path d="M12 22c4 0 7-2.9 7-7 0-3-1.7-5.4-3.2-7.2-.5 1.4-1.3 2.4-2.3 3-.2-3-1.6-6-4.5-7.8.3 2.5-.6 4.2-2 5.9C5.6 10.6 5 12.4 5 15c0 4.1 3 7 7 7Z" />,
  unlock: (
    <>
      <rect x="4" y="11" width="16" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.8-1.3" />
    </>
  ),
  upload: <path d="M12 16V4m0 0 5 5m-5-5-5 5M4 20h16" />,
  download: <path d="M12 4v12m0 0 5-5m-5 5-5-5M4 20h16" />,
  idcard: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.6-1.4 1.7-2 3-2s2.4.6 3 2M14 9.5h5M14 13h5" />
    </>
  ),
  play: <path d="M7 4.5v15l12-7.5L7 4.5Z" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.8 2.8L16.5 9" />
    </>
  ),
  translate: <path d="M4 5h9M8.5 3v2c0 4-2.2 7.5-5 9m1-5c1.5 3 4 5.5 7 6.5M13 21l4.5-10L22 21m-7.5-3.5h6" />,
};

export default function Icon({ name, size = 15, filled = false, style }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={filled ? 0.5 : 1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{ verticalAlign: "-2px", flexShrink: 0, ...style }}
    >
      {P[name] || null}
    </svg>
  );
}
