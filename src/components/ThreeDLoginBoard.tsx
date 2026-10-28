import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import boardClosedExactImg from '../assets/images/board_closed_exact_matching_lid_1792324316682.jpg';

interface ThreeDLoginBoardProps {
  isOpening: boolean;
}

export function ThreeDLoginBoard({ isOpening }: ThreeDLoginBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const openingRef = useRef(isOpening);
  openingRef.current = isOpening;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('[Login board] WebGL unavailable', error);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.set(0, 0.35, 7.2);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xfff0ce, 1.5));
    const key = new THREE.DirectionalLight(0xffd78b, 2.8);
    key.position.set(3, 5, 6);
    scene.add(key);
    const blueRim = new THREE.PointLight(0x168cff, 2.2, 12);
    blueRim.position.set(-3, -1, 3);
    scene.add(blueRim);
    const goldRim = new THREE.PointLight(0xffb72e, 1.8, 10);
    goldRim.position.set(3, -2, 2);
    scene.add(goldRim);

    const textureLoader = new THREE.TextureLoader();
    const closedTexture = textureLoader.load(boardClosedExactImg);
    closedTexture.colorSpace = THREE.SRGBColorSpace;
    closedTexture.anisotropy = 4;

    const sideMaterial = new THREE.MeshStandardMaterial({ color: 0x3a210e, metalness: 0.65, roughness: 0.3 });
    const frontMaterial = new THREE.MeshBasicMaterial({ map: closedTexture });
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 4.05, 0.28),
      [sideMaterial, sideMaterial, sideMaterial, sideMaterial, frontMaterial, sideMaterial]
    );
    board.rotation.x = -0.12;
    board.rotation.y = -0.1;
    scene.add(board);

    const platform = new THREE.Mesh(
      new THREE.CylinderGeometry(2.3, 2.42, 0.18, 64),
      new THREE.MeshStandardMaterial({ color: 0x090d15, metalness: 0.92, roughness: 0.22 })
    );
    platform.position.set(0, -2.15, -0.25);
    scene.add(platform);

    const platformRim = new THREE.Mesh(
      new THREE.TorusGeometry(2.34, 0.035, 12, 64),
      new THREE.MeshStandardMaterial({ color: 0xffc64a, emissive: 0xb87919, emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.2 })
    );
    platformRim.rotation.x = Math.PI / 2;
    platformRim.position.set(0, -2.04, -0.25);
    scene.add(platformRim);

    const resize = () => {
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const targetY = openingRef.current ? -0.02 : -0.1;
      board.rotation.y += (targetY - board.rotation.y) * 0.045;
      board.position.y = Math.sin(performance.now() * 0.0007) * 0.025;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      closedTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative z-20 h-full min-h-0 w-full max-w-[min(88vw,420px)] flex-none overflow-hidden select-none pointer-events-none aspect-[.9] max-h-[min(48vh,440px)]">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
