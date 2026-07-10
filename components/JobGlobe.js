"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "react-globe.gl";
import { matchLocation } from "@/lib/geo";

// Real earth with country borders (Natural Earth GeoJSON), scroll zoom,
// click a country to outline it and fly in, click a city marker to go deeper.

const GEOJSON_URLS = [
  "https://globe.gl/example/datasets/ne_110m_admin_0_countries.geojson",
  "https://raw.githubusercontent.com/vasturiano/globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson",
];
const EARTH_IMG = "https://unpkg.com/three-globe/example/img/earth-night.jpg";
const BUMP_IMG = "https://unpkg.com/three-globe/example/img/earth-topology.png";

function featureName(f) {
  return f?.properties?.NAME || f?.properties?.ADMIN || "";
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

export default function JobGlobe({
  counts = {},
  selected = null,
  onSelect,
  cityPoints = [],
  selectedCity = null,
  onSelectCity,
}) {
  const wrapRef = useRef(null);
  const globeRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [features, setFeatures] = useState([]);
  const [hovered, setHovered] = useState(null);

  // measure container
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () =>
      setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
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
              // map the GeoJSON country to our canonical country name
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

  // globe controls: zoom enabled, slow auto-rotate until a country is picked
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    const controls = g.controls();
    controls.enableZoom = true;
    controls.zoomSpeed = 0.8;
    controls.autoRotate = !selected;
    controls.autoRotateSpeed = 0.55;
    controls.minDistance = 130;
    controls.maxDistance = 480;
  }, [selected, features]);

  // fly the camera when selection changes
  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
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
  }, [selected, selectedCity, features]);

  const maxCount = useMemo(
    () => Math.max(1, ...Object.values(counts)),
    [counts]
  );

  const capColor = (f) => {
    if (f.__jq === selected) return "rgba(59,130,246,0.35)";
    if (f === hovered) return "rgba(59,130,246,0.22)";
    const c = counts[f.__jq] || 0;
    if (!c) return "rgba(255,255,255,0.015)";
    const t = Math.sqrt(c / maxCount);
    return `rgba(245,181,68,${0.06 + t * 0.3})`;
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%", cursor: hovered ? "pointer" : "grab" }}>
      {size.w > 0 && (
        <Globe
          ref={globeRef}
          width={size.w}
          height={size.h}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl={EARTH_IMG}
          bumpImageUrl={BUMP_IMG}
          atmosphereColor="#3b82f6"
          atmosphereAltitude={0.18}
          polygonsData={features}
          polygonCapColor={capColor}
          polygonSideColor={() => "rgba(59,130,246,0.06)"}
          polygonStrokeColor={(f) =>
            f.__jq === selected ? "rgba(147,197,253,0.9)" : "rgba(255,255,255,0.28)"
          }
          polygonAltitude={(f) => (f.__jq === selected ? 0.015 : 0.004)}
          polygonsTransitionDuration={250}
          onPolygonHover={setHovered}
          onPolygonClick={(f) => {
            if (!onSelect) return;
            onSelect(f.__jq === selected ? null : f.__jq);
          }}
          polygonLabel={(f) => {
            const c = counts[f.__jq] || 0;
            return `<div style="background:rgba(8,12,22,.92);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 10px;font-size:12px;color:#e6ebf4;font-family:system-ui">
              <b>${f.__jq}</b> — ${c} open position${c === 1 ? "" : "s"}${c ? "<br/><span style='color:#98a4b5'>Click to explore</span>" : ""}
            </div>`;
          }}
          pointsData={selected ? cityPoints : []}
          pointLat={(d) => d.lat}
          pointLng={(d) => d.lng}
          pointColor={(d) => (d.name === selectedCity ? "#34d399" : "#fbbf24")}
          pointAltitude={(d) => (d.name === selectedCity ? 0.06 : 0.03)}
          pointRadius={(d) => 0.12 + 0.25 * Math.sqrt(d.count / Math.max(1, cityPoints[0]?.count || 1))}
          pointsTransitionDuration={300}
          onPointClick={(d) => {
            if (!onSelectCity) return;
            onSelectCity(d.name === selectedCity ? null : d.name);
          }}
          pointLabel={(d) =>
            `<div style="background:rgba(8,12,22,.92);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:5px 10px;font-size:12px;color:#e6ebf4;font-family:system-ui">
              <b>${d.label}</b> — ${d.count} job${d.count === 1 ? "" : "s"}
            </div>`
          }
        />
      )}
      <div style={{
        position: "absolute", bottom: 10, left: 14, color: "#64707f",
        fontSize: 11.5, pointerEvents: "none", userSelect: "none",
      }}>
        Scroll to zoom · drag to rotate · click a country
      </div>
    </div>
  );
}
