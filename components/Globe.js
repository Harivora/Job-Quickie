"use client";
import { useEffect, useRef } from "react";
import { loadGlobeLib } from "@/lib/globeLib";

// Landing-page globe: realistic earth over a starfield with animated
// "job found" arcs travelling between hiring hubs.

const IMG = "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img";

const HUBS = [
  { lat: 40.71, lng: -74.01 },   // New York
  { lat: 37.77, lng: -122.42 },  // San Francisco
  { lat: 51.51, lng: -0.13 },    // London
  { lat: 52.52, lng: 13.41 },    // Berlin
  { lat: 48.86, lng: 2.35 },     // Paris
  { lat: 19.08, lng: 72.88 },    // Mumbai
  { lat: 12.97, lng: 77.59 },    // Bangalore
  { lat: 1.35, lng: 103.82 },    // Singapore
  { lat: 35.68, lng: 139.69 },   // Tokyo
  { lat: -33.87, lng: 151.21 },  // Sydney
  { lat: -23.55, lng: -46.63 },  // São Paulo
  { lat: 43.65, lng: -79.38 },   // Toronto
  { lat: 25.2, lng: 55.27 },     // Dubai
  { lat: 52.37, lng: 4.9 },      // Amsterdam
];

function makeArcs() {
  const out = [];
  for (let i = 0; i < 22; i++) {
    const a = HUBS[Math.floor(Math.random() * HUBS.length)];
    let b = HUBS[Math.floor(Math.random() * HUBS.length)];
    if (b === a) b = HUBS[(HUBS.indexOf(a) + 3) % HUBS.length];
    out.push({
      startLat: a.lat, startLng: a.lng,
      endLat: b.lat, endLng: b.lng,
      color: Math.random() > 0.5 ? "#fbbf24" : "#34d399",
      time: 2500 + Math.random() * 3500,
    });
  }
  return out;
}

export default function Globe() {
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let g = null, ro = null, dead = false;

    loadGlobeLib().then((GlobeLib) => {
      if (dead || !el.isConnected) return;
      g = GlobeLib()(el)
        .width(el.clientWidth)
        .height(el.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl(`${IMG}/earth-blue-marble.jpg`)
        .bumpImageUrl(`${IMG}/earth-topology.png`)
        .atmosphereColor("#4f8cff")
        .atmosphereAltitude(0.2)
        .arcsData(makeArcs())
        .arcColor("color")
        .arcStroke(0.45)
        .arcAltitudeAutoScale(0.4)
        .arcDashLength(0.45)
        .arcDashGap(0.7)
        .arcDashAnimateTime((d) => d.time)
        .ringsData(HUBS.map((h) => ({ lat: h.lat, lng: h.lng })))
        .ringColor(() => (t) => `rgba(79,140,255,${1 - t})`)
        .ringMaxRadius(2.2)
        .ringPropagationSpeed(1.4)
        .ringRepeatPeriod(2600)
        .enablePointerInteraction(false)
        .pointOfView({ lat: 22, lng: 40, altitude: 1.9 });
      const controls = g.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.7;
      controls.enableZoom = false;
      ro = new ResizeObserver(() => {
        if (g) g.width(el.clientWidth).height(el.clientHeight);
      });
      ro.observe(el);
    }).catch(() => {});

    return () => {
      dead = true;
      if (ro) ro.disconnect();
      if (g) { try { g._destructor(); } catch {} }
      el.innerHTML = "";
    };
  }, []);

  return <div ref={wrapRef} style={{ width: "100%", height: "100%" }} />;
}
