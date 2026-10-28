/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type WindDirection = 'left' | 'calm' | 'right' | 'up';

export type CloudType = 'wispy' | 'puffy' | 'rain' | 'storm';

export type LandscapeType = 'forest' | 'village' | 'city' | 'island';

export interface CloudPuff {
  dx: number;
  dy: number;
  radius: number;
  opacity: number;
  colorOffset?: number;
}

export interface Cloud {
  id: string;
  type: CloudType;
  x: number;
  y: number;
  baseWidth: number;
  baseHeight: number;
  scale: number;
  targetScale: number;
  opacity: number;
  dissolving: boolean;
  puffs: CloudPuff[];
  seed: number;
  altitudeRatio: number; // 0 to 1 in sky
  rainTimer: number;
  lightningTimer: number;
  isFlashing: boolean;
  flashIntensity: number;
  wobblePhase: number;
  bobSpeed: number;
  speedMultiplier: number;
  shadowOpacity: number;
}

export interface RainDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  opacity: number;
  color: string;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export interface WindStream {
  x: number;
  y: number;
  length: number;
  speed: number;
  width: number;
  opacity: number;
  wobble: number;
}

export interface Flower {
  x: number;
  y: number;
  color: string;
  bloom: number; // 0 to 1
  swayOffset: number;
  stemHeight: number;
  targetBloom: number;
}

export interface Puddle {
  x: number;
  y: number;
  rx: number;
  ry: number;
  fill: number; // 0 to 1
}
