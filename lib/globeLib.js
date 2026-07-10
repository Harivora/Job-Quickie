"use client";

// Loads the globe.gl UMD bundle at runtime (with CDN fallback) and returns
// the window.Globe factory. Bundling globe.gl through webpack produces a
// broken duplicate-three.js scene, so we deliberately load the prebuilt
// browser bundle instead — same approach as globe.gl's own examples.

const SRC = [
  "https://cdn.jsdelivr.net/npm/globe.gl@2.46.1/dist/globe.gl.min.js",
  "https://unpkg.com/globe.gl@2.46.1/dist/globe.gl.min.js",
];

let promise = null;

export function loadGlobeLib() {
  if (typeof window === "undefined") return Promise.reject(new Error("ssr"));
  if (window.Globe) return Promise.resolve(window.Globe);
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const tryLoad = (i) => {
      if (i >= SRC.length) { promise = null; reject(new Error("globe.gl failed to load")); return; }
      const s = document.createElement("script");
      s.src = SRC[i];
      s.async = true;
      s.onload = () => (window.Globe ? resolve(window.Globe) : tryLoad(i + 1));
      s.onerror = () => { s.remove(); tryLoad(i + 1); };
      document.head.appendChild(s);
    };
    tryLoad(0);
  });
  return promise;
}
