"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import GlobeGL from "react-globe.gl";

// Landing-page globe: realistic earth over a starfield with animated
// "job found" arcs travelling between hiring hubs.

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

export default function Globe() {
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.enableZoom = false;
    g.pointOfView({ lat: 22, lng: 40, altitude: 1.9 });
  }, [size.w]);

  const arcs = useMemo(() => {
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
  }, []);

  const rings = useMemo(
    () => HUBS.map((h) => ({ lat: h.lat, lng: h.lng })),
    []
  );

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      {size.w > 0 && (
        <GlobeGL
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          backgroundImageUrl="/globe/night-sky.png"
          globeImageUrl="/globe/earth-blue-marble.jpg"
          bumpImageUrl="/globe/earth-topology.png"
          atmosphereColor="#4f8cff"
          atmosphereAltitude={0.2}
          arcsData={arcs}
          arcColor="color"
          arcStroke={0.45}
          arcAltitudeAutoScale={0.4}
          arcDashLength={0.45}
          arcDashGap={0.7}
          arcDashAnimateTime={(d) => d.time}
          ringsData={rings}
          ringColor={() => (t) => `rgba(79,140,255,${1 - t})`}
          ringMaxRadius={2.2}
          ringPropagationSpeed={1.4}
          ringRepeatPeriod={2600}
          enablePointerInteraction={false}
        />
      )}
    </div>
  );
}
