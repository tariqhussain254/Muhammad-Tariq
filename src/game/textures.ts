import * as THREE from 'three';

/**
 * Procedural PBR Texture Generator
 * Zero external 404 dependencies; renders high-res tileable maps to CanvasTexture
 */

export function createGroundTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base grass / earth gradient
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#2d5a27');
  grad.addColorStop(0.5, '#3b6e32');
  grad.addColorStop(1, '#254620');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Micro-texture noise & soil patches
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 2.5 + 0.5;
    const tone = Math.random();
    if (tone < 0.4) {
      ctx.fillStyle = 'rgba(74, 124, 60, 0.4)';
    } else if (tone < 0.7) {
      ctx.fillStyle = 'rgba(30, 60, 24, 0.5)';
    } else {
      ctx.fillStyle = 'rgba(82, 68, 54, 0.25)'; // Dirt specks
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(24, 24);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export function createStoneTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#686e75';
  ctx.fillRect(0, 0, 256, 256);

  // Ashlar block joints
  ctx.strokeStyle = '#373a3e';
  ctx.lineWidth = 3;
  const rowHeight = 32;
  for (let y = 0; y <= 256; y += rowHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();

    const offset = (y / rowHeight) % 2 === 0 ? 0 : 32;
    for (let x = offset; x <= 256; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
    }
  }

  // Chipped stone noise
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.12)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export function createWoodTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6a432d';
  ctx.fillRect(0, 0, 256, 256);

  // Plank lines
  ctx.strokeStyle = '#422818';
  ctx.lineWidth = 2;
  for (let x = 0; x <= 256; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
    ctx.stroke();
  }

  // Grain streaks
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(130, 85, 55, 0.15)' : 'rgba(40, 20, 10, 0.2)';
    const gx = Math.random() * 256;
    const gy = Math.random() * 256;
    ctx.fillRect(gx, gy, Math.random() * 2 + 1, Math.random() * 30 + 10);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.65)');
  grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
