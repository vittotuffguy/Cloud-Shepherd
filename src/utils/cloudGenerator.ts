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
    baseWidth = 220 + Math.random() * 60;
    baseHeight = 44;
    speedMultiplier = 1.8;
    shadowOpacity = 0.08;
    puffs.push({ dx: 0, dy: 0, radius: 36, opacity: 1.0 });
    puffs.push({ dx: -baseWidth * 0.28, dy: -2, radius: 26, opacity: 1.0 });
    puffs.push({ dx: baseWidth * 0.28, dy: 2, radius: 28, opacity: 1.0 });
  } else if (type === 'puffy') {
    // Puffy: round, slow-moving, gentle shade
    baseWidth = 160 + Math.random() * 40;
    baseHeight = 85;
    speedMultiplier = 0.65;
    shadowOpacity = 0.16;
    puffs.push({ dx: 0, dy: -12, radius: 40, opacity: 1.0 }); // Central high puff
    puffs.push({ dx: -36, dy: -6, radius: 32, opacity: 1.0 });
    puffs.push({ dx: 38, dy: -4, radius: 34, opacity: 1.0 });
    puffs.push({ dx: -58, dy: 8, radius: 26, opacity: 1.0 });
    puffs.push({ dx: 56, dy: 9, radius: 27, opacity: 1.0 });
    puffs.push({ dx: -20, dy: 10, radius: 28, opacity: 1.0 });
    puffs.push({ dx: 20, dy: 11, radius: 29, opacity: 1.0 });
  } else if (type === 'rain') {
    // Rain: darker and fuller, ordinary rain, moderate shade
    baseWidth = 185 + Math.random() * 45;
    baseHeight = 90;
    speedMultiplier = 1.0;
    shadowOpacity = 0.24;
    puffs.push({ dx: 0, dy: -12, radius: 42, opacity: 1.0 });
    puffs.push({ dx: -44, dy: -5, radius: 36, opacity: 1.0 });
    puffs.push({ dx: 46, dy: -3, radius: 37, opacity: 1.0 });
    puffs.push({ dx: -70, dy: 9, radius: 30, opacity: 1.0 });
    puffs.push({ dx: 68, dy: 11, radius: 30, opacity: 1.0 });
    puffs.push({ dx: -24, dy: 12, radius: 32, opacity: 1.0 });
    puffs.push({ dx: 24, dy: 14, radius: 34, opacity: 1.0 });
  } else if (type === 'storm') {
    // Storm: large, dramatic, heavy shade, brings heavy winds & rain
    baseWidth = 250 + Math.random() * 50;
    baseHeight = 135;
    speedMultiplier = 0.88;
    shadowOpacity = 0.36;
    puffs.push({ dx: 0, dy: -28, radius: 54, opacity: 1.0 }); // High towering core
    puffs.push({ dx: -56, dy: -22, radius: 46, opacity: 1.0 });
    puffs.push({ dx: 58, dy: -20, radius: 48, opacity: 1.0 });
    puffs.push({ dx: -98, dy: -30, radius: 42, opacity: 1.0 }); // Anvil shelf
    puffs.push({ dx: 100, dy: -28, radius: 44, opacity: 1.0 });
    puffs.push({ dx: -40, dy: 14, radius: 38, opacity: 1.0 });
    puffs.push({ dx: 40, dy: 16, radius: 40, opacity: 1.0 });
    puffs.push({ dx: 0, dy: 22, radius: 42, opacity: 1.0 });
    puffs.push({ dx: -76, dy: 22, radius: 32, opacity: 1.0 });
    puffs.push({ dx: 78, dy: 24, radius: 32, opacity: 1.0 });
  }

  return {
    id: `cloud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    type,
    x,
    y,
    baseWidth,
    baseHeight,
    scale: startSmall ? 0.3 : scale,
    targetScale: scale,
    opacity: 1.0,
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
