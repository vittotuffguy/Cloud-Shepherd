/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Cloud, CloudPuff, CloudType } from '../types';

export function createCloud(
  type: CloudType,
  x: number,
  y: number,
  scale: number = 1.0,
  startSmall: boolean = true
): Cloud {
  const seed = Math.floor(Math.random() * 10000);
  let baseWidth = 160;
  let baseHeight = 70;
  let speedMultiplier = 1.0;
  let shadowOpacity = 0.14;
  const puffs: CloudPuff[] = [];

  if (type === 'wispy') {
    // Wispy: thin, delicate, fast-moving, faint shadow
    baseWidth = 210 + Math.random() * 70;
    baseHeight = 42;
    speedMultiplier = 1.8;
    shadowOpacity = 0.06;
    puffs.push({ dx: 0, dy: 0, radius: 36, opacity: 0.55 });
    puffs.push({ dx: -baseWidth * 0.3, dy: -2, radius: 26, opacity: 0.45 });
    puffs.push({ dx: baseWidth * 0.3, dy: 2, radius: 28, opacity: 0.45 });
  } else if (type === 'puffy') {
    // Puffy: round, slow-moving, gentle shade
    baseWidth = 155 + Math.random() * 45;
    baseHeight = 85;
    speedMultiplier = 0.65;
    shadowOpacity = 0.14;
    puffs.push({ dx: 0, dy: -12, radius: 38, opacity: 0.95 }); // Central high puff
    puffs.push({ dx: -35, dy: -6, radius: 30, opacity: 0.92 });
    puffs.push({ dx: 38, dy: -4, radius: 32, opacity: 0.92 });
    puffs.push({ dx: -56, dy: 7, radius: 24, opacity: 0.88 });
    puffs.push({ dx: 54, dy: 8, radius: 25, opacity: 0.88 });
    puffs.push({ dx: -18, dy: 9, radius: 26, opacity: 0.9 });
    puffs.push({ dx: 18, dy: 10, radius: 27, opacity: 0.9 });
  } else if (type === 'rain') {
    // Rain: darker and fuller, ordinary rain, moderate shade
    baseWidth = 180 + Math.random() * 50;
    baseHeight = 90;
    speedMultiplier = 1.0;
    shadowOpacity = 0.22;
    puffs.push({ dx: 0, dy: -12, radius: 40, opacity: 0.96 });
    puffs.push({ dx: -42, dy: -5, radius: 34, opacity: 0.95 });
    puffs.push({ dx: 44, dy: -3, radius: 35, opacity: 0.95 });
    puffs.push({ dx: -68, dy: 8, radius: 28, opacity: 0.92 });
    puffs.push({ dx: 66, dy: 10, radius: 28, opacity: 0.92 });
    puffs.push({ dx: -22, dy: 11, radius: 30, opacity: 0.95 });
    puffs.push({ dx: 22, dy: 13, radius: 32, opacity: 0.95 });
  } else if (type === 'storm') {
    // Storm: large, dramatic, heavy shade, brings heavy winds & rain
    baseWidth = 240 + Math.random() * 60;
    baseHeight = 135;
    speedMultiplier = 0.88;
    shadowOpacity = 0.35;
    puffs.push({ dx: 0, dy: -28, radius: 52, opacity: 0.98 }); // High towering core
    puffs.push({ dx: -54, dy: -22, radius: 45, opacity: 0.96 });
    puffs.push({ dx: 56, dy: -20, radius: 47, opacity: 0.96 });
    puffs.push({ dx: -96, dy: -30, radius: 40, opacity: 0.94 }); // Anvil shelf
    puffs.push({ dx: 98, dy: -28, radius: 42, opacity: 0.94 });
    puffs.push({ dx: -38, dy: 14, radius: 36, opacity: 0.96 });
    puffs.push({ dx: 38, dy: 16, radius: 38, opacity: 0.96 });
    puffs.push({ dx: 0, dy: 20, radius: 40, opacity: 0.98 });
    puffs.push({ dx: -74, dy: 20, radius: 30, opacity: 0.92 });
    puffs.push({ dx: 76, dy: 22, radius: 30, opacity: 0.92 });
  }

  return {
    id: `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    x,
    y,
    baseWidth,
    baseHeight,
    scale: startSmall ? 0.1 : scale,
    targetScale: scale,
    opacity: startSmall ? 0.1 : 1.0,
    dissolving: false,
    puffs,
    seed,
    altitudeRatio: 0.3,
    rainTimer: 0,
    lightningTimer: 3 + Math.random() * 4,
    isFlashing: false,
    flashIntensity: 0,
    wobblePhase: Math.random() * Math.PI * 2,
    bobSpeed: 0.7 + Math.random() * 0.5,
    speedMultiplier,
    shadowOpacity,
  };
}

export function createDefaultPreset(screenWidth: number, screenHeight: number): Cloud[] {
  const w = screenWidth || 1000;
  const h = screenHeight || 700;

  return [
    createCloud('wispy', w * 0.25, h * 0.16, 1.05, false),
    createCloud('puffy', w * 0.6, h * 0.22, 1.0, false),
    createCloud('rain', w * 0.82, h * 0.36, 0.95, false),
  ];
}
