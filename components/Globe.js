"use client";
import { useEffect, useRef } from "react";
import * as THREE from "three";

// Rotating point-cloud earth with orbiting "job" markers.
export default function Globe() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      el.clientWidth / el.clientHeight,
      0.1,
      100
    );
    camera.position.z = 7;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    el.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    // Sphere of points (continent-like density via noise threshold)
    const R = 2.4;
    const positions = [];
    for (let i = 0; i < 9000; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      // pseudo-noise to cluster points like landmasses
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
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
    const pts = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ color: 0x6ea0ff, size: 0.035, transparent: true, opacity: 0.9 })
    );
    group.add(pts);

    // Faint inner sphere
    const inner = new THREE.Mesh(
      new THREE.SphereGeometry(R - 0.04, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0x0b1730, transparent: true, opacity: 0.85 })
    );
    group.add(inner);

    // Atmosphere ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(R + 0.5, R + 0.52, 128),
      new THREE.MeshBasicMaterial({ color: 0x2a4a8a, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
    );
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    // Orbiting job markers
    const markers = [];
    for (let i = 0; i < 14; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0x2dd4a7 : 0xf5b544 })
      );
      m.userData = {
        r: R + 0.35 + Math.random() * 0.5,
        speed: 0.15 + Math.random() * 0.3,
        offset: Math.random() * Math.PI * 2,
        tilt: (Math.random() - 0.5) * 1.6,
      };
      scene.add(m);
      markers.push(m);
    }

    let raf;
    const clock = new THREE.Clock();
    const animate = () => {
      const t = clock.getElapsedTime();
      group.rotation.y = t * 0.12;
      ring.rotation.z = t * 0.05;
      markers.forEach((m) => {
        const { r, speed, offset, tilt } = m.userData;
        const a = t * speed + offset;
        m.position.set(
          r * Math.cos(a),
          r * Math.sin(a) * Math.sin(tilt),
          r * Math.sin(a) * Math.cos(tilt)
        );
      });
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
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} style={{ width: "100%", height: "100%" }} />;
}
