"use client";
import { useEffect, useRef, useState } from "react";
import { loadGlobeLib } from "@/lib/globeLib";
import { matchLocation } from "@/lib/geo";

// Real earth with country borders (Natural Earth data), scroll zoom,
// click a country to outline it and fly in, click a city marker to go deeper.
// globe.gl is loaded as a prebuilt browser bundle (see lib/globeLib.js).

const GEOJSON_URLS = [
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/country-polygons/ne_110m_admin_0_countries.geojson",
  "https://unpkg.com/three-globe@2.31.1/example/country-polygons/ne_110m_admin_0_countries.geojson",
];
const IMG = "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img";

function featureName(f) {
  return f?.properties?.NAME || f?.properties?.name || f?.properties?.ADMIN || "";
}

// centroid + rough span of a (Multi)Polygon feature
function featureCenter(f) {
  let sx = 0, sy = 0, n = 0;
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  const scan = (ring) => {
    for (const [lon, lat] of ring) {
      sx += lon; sy += lat; n++;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    }
  };
  const g = f.geometry;
  if (g.type === "Polygon") g.coordinates.forEach(scan);
  else if (g.type === "MultiPolygon") g.coordinates.forEach((p) => p.forEach(scan));
  const span = Math.max(maxLat - minLat, (maxLon - minLon) * 0.7);
  return { lat: sy / n, lng: sx / n, span };
}

const tip = (title, body) =>
  `<div style="background:rgba(8,12,22,.92);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 10px;font-size:12px;color:#e6ebf4;font-family:system-ui"><b>${title}</b>${body}</div>`;

export default function JobGlobe({
  counts = {},
  selected = null,
  onSelect,
  cityPoints = [],
  selectedCity = null,
  onSelectCity,
}) {
  const wrapRef = useRef(null);
  const gRef = useRef(null);          // globe.gl instance
  const propsRef = useRef({});        // latest props for event handlers
  const hoveredRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [features, setFeatures] = useState([]);

  propsRef.current = { counts, selected, onSelect, cityPoints, selectedCity, onSelectCity };

  // create globe instance
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let dead = false, ro = null;

    loadGlobeLib().then((GlobeLib) => {
      if (dead || !el.isConnected) return;
      const g = GlobeLib()(el)
        .width(el.clientWidth)
        .height(el.clientHeight)
        .backgroundColor("rgba(0,0,0,0)")
        .globeImageUrl(`${IMG}/earth-blue-marble.jpg`)
        .bumpImageUrl(`${IMG}/earth-topology.png`)
        .atmosphereColor("#3b82f6")
        .atmosphereAltitude(0.18)
        .polygonsTransitionDuration(250)
        .onPolygonHover((h) => {
          hoveredRef.current = h;
          el.style.cursor = h ? "pointer" : "grab";
          applyStyles(g, propsRef, hoveredRef);
        })
        .onPolygonClick((f) => {
          const p = propsRef.current;
          if (p.onSelect) p.onSelect(f.__jq === p.selected ? null : f.__jq);
        })
        .polygonLabel((f) => {
          const c = propsRef.current.counts[f.__jq] || 0;
          return tip(f.__jq, ` — ${c} open position${c === 1 ? "" : "s"}${c ? "<br/><span style='color:#98a4b5'>Click to explore</span>" : ""}`);
        })
        .pointLat("lat")
        .pointLng("lng")
        .pointsTransitionDuration(300)
        .onPointClick((d) => {
          const p = propsRef.current;
          if (p.onSelectCity) p.onSelectCity(d.name === p.selectedCity ? null : d.name);
        })
        .pointLabel((d) => tip(d.label, ` — ${d.count} job${d.count === 1 ? "" : "s"}`))
        .pointOfView({ lat: 20, lng: 10, altitude: 2.2 });
      const controls = g.controls();
      controls.enableZoom = true;
      controls.zoomSpeed = 0.8;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.55;
      controls.minDistance = 130;
      controls.maxDistance = 480;
      gRef.current = g;
      ro = new ResizeObserver(() => g.width(el.clientWidth).height(el.clientHeight));
      ro.observe(el);
      setReady(true);
    }).catch(() => {});

    return () => {
      dead = true;
      if (ro) ro.disconnect();
      if (gRef.current) { try { gRef.current._destructor(); } catch {} gRef.current = null; }
      el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load country borders
  useEffect(() => {
    let dead = false;
    (async () => {
      for (const url of GEOJSON_URLS) {
        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const geo = await res.json();
          if (dead) return;
          const feats = (geo.features || [])
            .filter((f) => featureName(f) !== "Antarctica")
            .map((f) => {
              const m = matchLocation(featureName(f), "");
              f.__jq = m.countries[0] || featureName(f);
              return f;
            });
          setFeatures(feats);
          return;
        } catch {}
      }
    })();
    return () => { dead = true; };
  }, []);

  // push data + styles into the globe when anything changes
  useEffect(() => {
    const g = gRef.current;
    if (!g || !ready) return;
    g.polygonsData(features);
    g.pointsData(selected ? cityPoints : []);
    applyStyles(g, propsRef, hoveredRef);
    g.controls().autoRotate = !selected;
  }, [ready, features, counts, selected, cityPoints, selectedCity]);

  // fly the camera when selection changes
  useEffect(() => {
    const g = gRef.current;
    if (!g || !ready) return;
    if (selectedCity) {
      const cp = cityPoints.find((c) => c.name === selectedCity);
      if (cp) { g.pointOfView({ lat: cp.lat, lng: cp.lng, altitude: 0.35 }, 1200); return; }
    }
    if (selected) {
      const f = features.find((x) => x.__jq === selected);
      if (f) {
        const { lat, lng, span } = featureCenter(f);
        const altitude = Math.min(2, Math.max(0.45, span / 28));
        g.pointOfView({ lat, lng, altitude }, 1200);
        return;
      }
    }
    g.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 1200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selected, selectedCity, features]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={wrapRef} style={{ width: "100%", height: "100%", cursor: "grab" }} />
      <div style={{
        position: "absolute", bottom: 10, left: 14, color: "#64707f",
        fontSize: 11.5, pointerEvents: "none", userSelect: "none",
      }}>
        Scroll to zoom · drag to rotate · click a country
      </div>
    </div>
  );
}

function applyStyles(g, propsRef, hoveredRef) {
  const { counts, selected, cityPoints, selectedCity } = propsRef.current;
  const maxCount = Math.max(1, ...Object.values(counts));
  const topCity = Math.max(1, cityPoints[0]?.count || 1);
  g.polygonCapColor((f) => {
    if (f.__jq === selected) return "rgba(59,130,246,0.5)";
    if (f === hoveredRef.current) return "rgba(96,165,250,0.35)";
    const c = counts[f.__jq] || 0;
    if (!c) return "rgba(255,255,255,0.02)";
    const t = Math.sqrt(c / maxCount);
    return `rgba(251,191,36,${0.1 + t * 0.35})`;
  });
  g.polygonSideColor(() => "rgba(59,130,246,0.06)");
  g.polygonStrokeColor((f) =>
    f.__jq === selected ? "rgba(147,197,253,0.9)" : "rgba(255,255,255,0.28)"
  );
  g.polygonAltitude((f) => (f.__jq === selected ? 0.015 : 0.004));
  g.pointColor((d) => (d.name === selectedCity ? "#34d399" : "#fbbf24"));
  g.pointAltitude((d) => (d.name === selectedCity ? 0.06 : 0.03));
  g.pointRadius((d) => 0.12 + 0.25 * Math.sqrt(d.count / topCity));
}
