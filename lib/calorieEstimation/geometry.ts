import { Point } from './types';

export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0;
  
  let area = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  return Math.abs(area) / 2;
}

export function calculateCircleArea(radius: number): number {
  return Math.PI * radius * radius;
}

export function calculatePolygonCentroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  
  let cx = 0;
  let cy = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    cx += points[i].x;
    cy += points[i].y;
  }
  
  return { x: cx / n, y: cy / n };
}

export function calculateDiameterFromCircle(diameterPx: number): number {
  return diameterPx;
}

export function calculateDiameterFromPolygon(points: Point[]): number {
  if (points.length < 2) return 0;
  
  let maxDistSq = 0;
  const n = points.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const distSq = dx * dx + dy * dy;
      if (distSq > maxDistSq) {
        maxDistSq = distSq;
      }
    }
  }
  
  return Math.sqrt(maxDistSq);
}

export function pixelsToCm(pixels: number, cmPerPixel: number): number {
  return pixels * cmPerPixel;
}

export function cmToPixels(cm: number, cmPerPixel: number): number {
  if (cmPerPixel === 0) return 0;
  return cm / cmPerPixel;
}