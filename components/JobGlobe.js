"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { COUNTRIES } from "@/lib/geo";

// Interactive globe: drag to roam, hover for tooltip, click a country
// marker to filter jobs. Marker size reflects the number of openings.
export default function JobGlobe({ counts = {}, selected = null, onSelect }) {
  const wrapRef = useRef(null);
  const tipRef = useRef(null);
  const stateRef = useRef({});
  const propsRef = useRef({ counts, selected, onSelect });
  propsRef.current = { counts, selected, onSelect };

  // one-time scene setup
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    camera.position.z = 7.2;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const globe = new THREE.Group();
    scene.add(globe);

    const R = 2.5;
    // land-like point cloud
    const positions = [];
    for (let i = 0; i < 8000; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const n =
        Math.sin(phi * 4 + 1.3) * Math.cos(theta * 3 + 0.7) +
        Math.sin(phi * 7) * Math.cos(theta * 5) * 0.5;
      if (n < 0.15) continue;
      positions.push(
        R * Math.sin(phi) * Math.cos(theta),
        R * Math.cos(phi),
        R * Math.sin(phi) * Math.sin(theta)
      );
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    globe.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x3b6fd4, size: 0.03, transparent: true, opacity: 0.75 })));
    globe.add(new THREE.Mesh(
      new THREE.SphereGeometry(R - 0.04, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x0b1730, transparent: true, opacity: 0.92 })
    ));

    const markers = new THREE.Group();
    globe.add(markers);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const st = stateRef.current;
    Object.assign(st, {
      scene, camera, renderer, globe, markers, R,
      dragging: false, moved: 0, lastX: 0, lastY: 0,
      velX: 0.0022, rotX: 0.35, idleAt: 0, hovered: null,
    });

    const setPointer = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const pick = () => {
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(markers.children.filter((m) => m.userData.hit));
      return hits.length ? hits[0].object : null;
    };

    const onDown = (e) => {
      st.dragging = true; st.moved = 0;
      st.lastX = e.clientX; st.lastY = e.clientY;
    };
    const onMove = (e) => {
      setPointer(e);
      if (st.dragging) {
        const dx = e.clientX - st.lastX;
        const dy = e.clientY - st.lastY;
        st.moved += Math.abs(dx) + Math.abs(dy);
        globe.rotation.y += dx * 0.005;
        st.rotX = Math.max(-1.1, Math.min(1.1, st.rotX + dy * 0.003));
        st.lastX = e.clientX; st.lastY = e.clientY;
        st.idleAt = performance.now();
        return;
      }
      const hit = pick();
      const tip = tipRef.current;
      if (hit && tip) {
        st.hovered = hit.userData.country;
        const rect = renderer.domElement.getBoundingClientRect();
        tip.style.display = "block";
        tip.style.left = e.clientX - rect.left + 12 + "px";
        tip.style.top = e.clientY - rect.top - 10 + "px";
        tip.textContent = `${hit.userData.country} — ${hit.userData.count} job${hit.userData.count === 1 ? "" : "s"}`;
        renderer.domElement.style.cursor = "pointer";
      } else if (tip) {
        st.hovered = null;
        tip.style.display = "none";
        renderer.domElement.style.cursor = "grab";
      }
    };
    const onUp = (e) => {
      const wasDrag = st.moved > 6;
      st.dragging = false;
      st.idleAt = performance.now();
      if (wasDrag) return;
      setPointer(e);
      const hit = pick();
      const { selected: sel, onSelect: cb } = propsRef.current;
      if (hit && cb) cb(hit.userData.country === sel ? null : hit.userData.country);
    };

    const dom = renderer.domElement;
    dom.style.cursor = "grab";
    dom.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    let raf;
    const animate = () => {
      // gentle auto-rotate after 2.5s idle
      if (!st.dragging && performance.now() - st.idleAt > 2500) {
        globe.rotation.y += st.velX;
      }
      globe.rotation.x = st.rotX;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      dom.removeEventListener("pointerdown", onDown);
      renderer.dispose();
      el.removeChild(dom);
    };
  }, []);

  // rebuild markers whenever counts / selection change
  useEffect(() => {
    const st = stateRef.current;
    if (!st.markers) return;
    const { markers, R } = st;
    while (markers.children.length) {
      const m = markers.children.pop();
      m.geometry?.dispose();
      m.material?.dispose();
    }
    const max = Math.max(1, ...Object.values(counts));
    for (const c of COUNTRIES) {
      const count = counts[c.n] || 0;
      if (!count) continue;
      const phi = (90 - c.lat) * (Math.PI / 180);
      const theta = (c.lon + 90) * (Math.PI / 180);
      const pos = new THREE.Vector3(
        R * Math.sin(phi) * Math.cos(theta),
        R * Math.cos(phi),
        R * Math.sin(phi) * Math.sin(theta)
      );
      const isSel = selected === c.n;
      const size = 0.055 + 0.11 * Math.sqrt(count / max);
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(size, 14, 14),
        new THREE.MeshBasicMaterial({ color: isSel ? 0x2dd4a7 : 0xf5b544 })
      );
      dot.position.copy(pos).multiplyScalar(1.01);
      markers.add(dot);
      // glow halo for the selected country
      if (isSel) {
        const halo = new THREE.Mesh(
          new THREE.SphereGeometry(size * 1.9, 14, 14),
          new THREE.MeshBasicMaterial({ color: 0x2dd4a7, transparent: true, opacity: 0.25 })
        );
        halo.position.copy(dot.position);
        markers.add(halo);
      }
      // invisible, larger hit target for easy clicking
      const hit = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(size * 2.2, 0.16), 8, 8),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hit.position.copy(dot.position);
      hit.userData = { hit: true, country: c.n, count };
      markers.add(hit);
    }
  }, [counts, selected]);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        ref={tipRef}
        style={{
          display: "none", position: "absolute", zIndex: 5, pointerEvents: "none",
          background: "rgba(10,16,30,.92)", color: "#e8ecf6", border: "1px solid rgba(255,255,255,.15)",
          borderRadius: 6, padding: "4px 10px", fontSize: 12, whiteSpace: "nowrap",
        }}
      />
    </div>
  );
}
