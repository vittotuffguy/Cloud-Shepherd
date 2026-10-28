/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Cloud, CloudType, WindDirection, LandscapeType, RainDrop, Ripple, WindStream, Flower } from '../types';
import { sound } from '../audio';

interface WeatherCanvasProps {
  landscape: LandscapeType;
  wind: WindDirection;
  selectedCloudType: CloudType;
  clouds: Cloud[];
  onCloudClick: (cloudId: string) => void;
  onSkyClick: (x: number, y: number) => void;
}

export const WeatherCanvas: React.FC<WeatherCanvasProps> = ({
  landscape,
  wind,
  selectedCloudType,
  clouds,
  onCloudClick,
  onSkyClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Interaction tracking (drag vs click)
  const isPointerDownRef = useRef(false);
  const pointerStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedCloudIdRef = useRef<string | null>(null);
  const hoveredCloudIdRef = useRef<string | null>(null);
  const [cursorStyle, setCursorStyle] = useState<'crosshair' | 'pointer' | 'grab'>('crosshair');

  // Weather simulation variables
  const rainDropsRef = useRef<RainDrop[]>([]);
  const ripplesRef = useRef<Ripple[]>([]);
  const windStreamsRef = useRef<WindStream[]>([]);
  const flowersRef = useRef<Flower[]>([]);
  const floodLevelRef = useRef(0); // 0 (dry/normal) to 1 (gentle temporary high-water flood)
  const windmillAngleRef = useRef(0);
  const flagPhaseRef = useRef(0);
  const skyDarknessRef = useRef(0); // 0 (bright clear) to 1 (deep moody storm)
  const lightningFlashRef = useRef(0);
  const animationFrameIdRef = useRef<number | null>(null);

  // Get ground elevation function for the active landscape
  const getGroundY = (x: number, width: number, height: number): number => {
    const baseGround = height * 0.76;
    if (landscape === 'forest') {
      return baseGround + Math.sin((x / width) * Math.PI * 2.2 + 0.3) * (height * 0.045) +
             Math.cos((x / width) * Math.PI * 4.1) * (height * 0.02);
    } else if (landscape === 'village') {
      return baseGround + Math.sin((x / width) * Math.PI * 1.8 + 0.6) * (height * 0.05) +
             Math.cos((x / width) * Math.PI * 3.4 + 1.2) * (height * 0.025);
    } else if (landscape === 'city') {
      // Flatter urban boulevard with slight architectural elevation on left/right
      return baseGround + Math.sin((x / width) * Math.PI * 0.8) * (height * 0.015);
    } else {
      // island: gentle sloping beach mound down to lagoon on the right
      const normX = x / width;
      const dune = Math.cos((normX - 0.35) * Math.PI * 1.5) * (height * 0.05);
      return baseGround + dune;
    }
  };

  // Re-populate flowers when landscape changes or resized
  const initLandscapeFlowers = (width: number, height: number, type: LandscapeType) => {
    const list: Flower[] = [];
    let count = Math.floor(width / 24);
    let colors = ['#f43f5e', '#ec4899', '#a855f7', '#3b82f6', '#f59e0b', '#fbbf24', '#ffffff'];

    if (type === 'forest') {
      colors = ['#c084fc', '#f472b6', '#60a5fa', '#fef08a', '#ffffff'];
    } else if (type === 'village') {
      colors = ['#ef4444', '#f97316', '#fbbf24', '#ec4899', '#3b82f6'];
    } else if (type === 'city') {
      // Planter boxes along sidewalk
      colors = ['#f43f5e', '#fbbf24', '#a855f7', '#38bdf8'];
      count = Math.floor(width / 36);
    } else if (type === 'island') {
      // Tropical plumeria and hibiscus
      colors = ['#ff2a85', '#fbbf24', '#f97316', '#ffffff', '#ec4899'];
      count = Math.floor(width / 28);
    }

    for (let i = 0; i < count; i++) {
      const x = (i / count) * width + (Math.random() * 14 - 7);
      const groundY = getGroundY(x, width, height);
      list.push({
        x,
        y: groundY + 8 + Math.random() * (height - groundY - 14),
        color: colors[i % colors.length],
        bloom: 0.3 + Math.random() * 0.2, // starts as modest bud
        targetBloom: 0.35,
        swayOffset: Math.random() * Math.PI * 2,
        stemHeight: 6 + Math.random() * 7,
      });
    }
    flowersRef.current = list;
  };

  // Initialize wind streams
  const initWindStreams = (width: number, height: number) => {
    const streams: WindStream[] = [];
    for (let i = 0; i < 30; i++) {
      streams.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.7),
        length: 35 + Math.random() * 70,
        speed: 1.2 + Math.random() * 1.8,
        width: 1.2 + Math.random() * 1.6,
        opacity: 0.15 + Math.random() * 0.3,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    windStreamsRef.current = streams;
  };

  // Canvas size sync & landscape change handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      initLandscapeFlowers(width, height, landscape);
      if (windStreamsRef.current.length === 0) {
        initWindStreams(width, height);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [landscape]);

  // Main simulation & rendering loop
  useEffect(() => {
    let lastTime = performance.now();

    const render = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // 1. Calculate wind parameters + storm gusts
      let baseWindVx = 0;
      let baseWindVy = 0;
      let windStrength = 0;

      if (wind === 'left') {
        baseWindVx = -1.5;
        windStrength = 0.75;
      } else if (wind === 'right') {
        baseWindVx = 1.5;
        windStrength = 0.75;
      } else if (wind === 'up') {
        baseWindVx = 0.25;
        baseWindVy = -1.1;
        windStrength = 0.55;
      } else {
        // calm
        baseWindVx = 0.12;
        baseWindVy = 0;
        windStrength = 0.12;
      }

      // 2. Count weather intensities
      let stormCount = 0;
      let rainCount = 0;
      clouds.forEach((c) => {
        if (!c.dissolving) {
          if (c.type === 'storm') stormCount++;
          if (c.type === 'rain') rainCount++;
        }
      });

      // Storm clouds boost ambient wind gusts
      const stormWindBoost = stormCount > 0 ? (wind === 'left' ? -0.8 : 0.8) : 0;
      const effectiveWindVx = baseWindVx + stormWindBoost;
      const totalWindStrength = Math.min(1.5, windStrength + stormCount * 0.35);

      // Update flag fluttering phase
      flagPhaseRef.current += (3 + totalWindStrength * 8) * delta;

      // Smooth sky darkness transition
      const targetDarkness = Math.min(0.88, stormCount * 0.38 + rainCount * 0.16);
      skyDarknessRef.current += (targetDarkness - skyDarknessRef.current) * (delta * 1.6);

      // Water flood simulation for low-lying areas
      if (stormCount > 0) {
        // Storms bring temporary flood
        floodLevelRef.current = Math.min(1.0, floodLevelRef.current + delta * 0.14 * stormCount);
      } else if (rainCount > 0) {
        // Rain maintains a modest water level
        floodLevelRef.current = Math.min(0.35, floodLevelRef.current + delta * 0.04 * rainCount);
      } else {
        // Slowly and peacefully drains away
        floodLevelRef.current = Math.max(0, floodLevelRef.current - delta * 0.06);
      }

      // Audio continuous loop update
      sound.updateAmbience(stormCount * 1.6 + rainCount * 0.8, totalWindStrength);

      // Handle lightning flashes
      if (lightningFlashRef.current > 0) {
        lightningFlashRef.current = Math.max(0, lightningFlashRef.current - delta * 3.8);
      }

      // 3. Draw Background Sky Gradient
      const dark = skyDarknessRef.current;
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.82);

      // Smooth daytime azure -> cozy moody storm twilight
      const topR = Math.round(96 * (1 - dark) + 26 * dark);
      const topG = Math.round(165 * (1 - dark) + 32 * dark);
      const topB = Math.round(250 * (1 - dark) + 68 * dark);

      const midR = Math.round(186 * (1 - dark) + 42 * dark);
      const midG = Math.round(230 * (1 - dark) + 42 * dark);
      const midB = Math.round(253 * (1 - dark) + 115 * dark);

      const botR = Math.round(254 * (1 - dark) + 85 * dark);
      const botG = Math.round(240 * (1 - dark) + 95 * dark);
      const botB = Math.round(200 * (1 - dark) + 145 * dark);

      skyGrad.addColorStop(0, `rgb(${topR}, ${topG}, ${topB})`);
      skyGrad.addColorStop(0.55, `rgb(${midR}, ${midG}, ${midB})`);
      skyGrad.addColorStop(1, `rgb(${botR}, ${botG}, ${botB})`);

      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Warm sun in daytime fair weather
      if (dark < 0.65) {
        const sunX = width * 0.82;
        const sunY = height * 0.17;
        const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 140);
        sunGrad.addColorStop(0, `rgba(255, 253, 230, ${0.45 * (1 - dark)})`);
        sunGrad.addColorStop(0.5, `rgba(254, 240, 138, ${0.16 * (1 - dark)})`);
        sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 140, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Update and Draw Wind Streams
      ctx.lineWidth = 1.3;
      windStreamsRef.current.forEach((stream) => {
        stream.x += (effectiveWindVx * 46 + stream.speed * 20) * delta;
        stream.y += (baseWindVy * 35) * delta;
        stream.wobble += delta * 2.2;

        if (stream.x > width + 80) stream.x = -80;
        if (stream.x < -80) stream.x = width + 80;
        if (stream.y < 10) stream.y = height * 0.7;
        if (stream.y > height * 0.72) stream.y = 20;

        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${stream.opacity * (totalWindStrength > 0.3 ? 0.36 : 0.16)})`;
        ctx.beginPath();
        const curveOffset = Math.sin(stream.wobble) * 6;
        const tailX = stream.x - (effectiveWindVx === 0 ? 30 : effectiveWindVx * 26);
        const tailY = stream.y - (baseWindVy * 15) + curveOffset;
        ctx.moveTo(tailX, tailY);
        ctx.quadraticCurveTo((tailX + stream.x) / 2, stream.y - curveOffset, stream.x, stream.y);
        ctx.stroke();
        ctx.restore();
      });

      // 5. Update and Draw Clouds
      clouds.forEach((cloud) => {
        // Growth or dissolve animation
        if (cloud.dissolving) {
          cloud.scale = Math.max(0, cloud.scale - delta * 2.2);
          cloud.opacity = Math.max(0, cloud.scale);
        } else if (cloud.scale < cloud.targetScale) {
          cloud.scale = Math.min(cloud.targetScale, cloud.scale + delta * 2.4);
        }

        // Skip completely dissolved clouds
        if (cloud.scale <= 0.01 || cloud.opacity <= 0.01) {
          return;
        }

        cloud.wobblePhase += delta * cloud.bobSpeed;
        const bobDy = Math.sin(cloud.wobblePhase) * 0.35;

        // Drift speed influenced by cloud type multiplier
        if (draggedCloudIdRef.current !== cloud.id) {
          const speedMul = cloud.speedMultiplier || 1.0;
          cloud.x += (effectiveWindVx * 30 * speedMul) * delta;
          cloud.y += (baseWindVy * 22 + bobDy) * delta;

          // Seamless edge wrapping
          const halfW = (cloud.baseWidth * Math.max(0.1, cloud.scale)) / 2;
          if (cloud.x > width + halfW) {
            cloud.x = -halfW + 10;
          } else if (cloud.x < -halfW) {
            cloud.x = width + halfW - 10;
          }

          // Bounds within sky
          const maxSkyY = height * 0.62;
          const minSkyY = height * 0.08;
          if (cloud.y < minSkyY) cloud.y = minSkyY;
          if (cloud.y > maxSkyY) cloud.y = maxSkyY;
        }

        // Rain precipitation from Rain and Storm clouds
        if (!cloud.dissolving && (cloud.type === 'rain' || cloud.type === 'storm')) {
          cloud.rainTimer += delta;
          const isStorm = cloud.type === 'storm';
          const spawnInterval = isStorm ? 0.025 : 0.06; // storm has heavier rain
          while (cloud.rainTimer >= spawnInterval) {
            cloud.rainTimer -= spawnInterval;
            const dropWidth = cloud.baseWidth * Math.max(0.1, cloud.scale) * 0.75;
            const dropX = cloud.x - dropWidth / 2 + Math.random() * dropWidth;
            const dropY = cloud.y + (cloud.baseHeight * Math.max(0.1, cloud.scale) * 0.25);
            rainDropsRef.current.push({
              x: dropX,
              y: dropY,
              vx: effectiveWindVx * 38 + (Math.random() * 8 - 4),
              vy: (isStorm ? 420 : 310) + Math.random() * 60,
              length: isStorm ? 16 : 9,
              opacity: 0.6 + Math.random() * 0.35,
              color: isStorm ? 'rgba(165, 180, 252, 0.8)' : 'rgba(191, 219, 254, 0.7)',
            });
          }
        }

        // Occasional peaceful distant lightning flash in storm clouds
        if (!cloud.dissolving && cloud.type === 'storm') {
          cloud.lightningTimer += delta;
          if (cloud.lightningTimer > 5.5 + (cloud.seed % 4)) {
            cloud.lightningTimer = 0;
            cloud.isFlashing = true;
            cloud.flashIntensity = 1.0;
            lightningFlashRef.current = 0.28;
            sound.playGentleLightning();
          }

          if (cloud.isFlashing) {
            cloud.flashIntensity -= delta * 3.0;
            if (cloud.flashIntensity <= 0) {
              cloud.isFlashing = false;
              cloud.flashIntensity = 0;
            }
          }
        }

        // Draw Cloud Shade/Shadow on Landscape Surface
        // Wispy = faint, Puffy = gentle, Rain = moderate, Storm = heavy
        if (cloud.scale > 0.02 && cloud.opacity > 0.02) {
          const shadowGroundY = getGroundY(cloud.x, width, height) + 12;
          const shadowRadiusX = Math.max(0.1, (cloud.baseWidth * cloud.scale * 0.9) / 2);
          const shadowRadiusY = Math.max(0.1, (14 * cloud.scale) / 2);
          const shadowOpacity = (cloud.shadowOpacity || 0.14) * cloud.opacity;

          ctx.save();
          ctx.fillStyle = `rgba(15, 23, 42, ${shadowOpacity})`;
          ctx.beginPath();
          ctx.ellipse(cloud.x, shadowGroundY, shadowRadiusX, shadowRadiusY, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Draw the cloud
        drawCloudBody(ctx, cloud, hoveredCloudIdRef.current === cloud.id);
      });

      // 6. Update and Draw Rain Drops
      ctx.lineWidth = 1.5;
      const remainingDrops: RainDrop[] = [];

      rainDropsRef.current.forEach((drop) => {
        drop.x += drop.vx * delta;
        drop.y += drop.vy * delta;

        const groundY = getGroundY(drop.x, width, height);
        if (drop.y >= groundY) {
          // Splash ripple
          if (ripplesRef.current.length < 80 && Math.random() < 0.45) {
            ripplesRef.current.push({
              x: drop.x,
              y: groundY,
              radius: 1,
              maxRadius: 7 + Math.random() * 6,
              opacity: 0.6,
            });
          }

          // Rain nourishes nearby flowers to target bloom
          flowersRef.current.forEach((fl) => {
            if (Math.abs(fl.x - drop.x) < 50) {
              fl.targetBloom = Math.min(1.0, fl.targetBloom + 0.025);
            }
          });
        } else {
          ctx.strokeStyle = drop.color;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          const angleVx = (drop.vx / drop.vy) * drop.length;
          ctx.lineTo(drop.x - angleVx, drop.y - drop.length);
          ctx.stroke();
          remainingDrops.push(drop);
        }
      });
      rainDropsRef.current = remainingDrops;

      // 7. Update and Draw Ripples
      const remainingRipples: Ripple[] = [];
      ctx.lineWidth = 1.0;
      ripplesRef.current.forEach((rip) => {
        rip.radius += delta * 22;
        rip.opacity -= delta * 1.8;
        if (rip.opacity > 0 && rip.radius < rip.maxRadius && rip.radius > 0) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${rip.opacity * 0.45})`;
          ctx.beginPath();
          ctx.ellipse(
            rip.x,
            rip.y,
            Math.max(0.1, rip.radius),
            Math.max(0.1, rip.radius * 0.38),
            0,
            0,
            Math.PI * 2
          );
          ctx.stroke();
          remainingRipples.push(rip);
        }
      });
      ripplesRef.current = remainingRipples;

      // 8. Update Flower Bloom (Flowers bloom gradually after rain)
      flowersRef.current.forEach((fl) => {
        if (fl.bloom < fl.targetBloom) {
          fl.bloom = Math.min(fl.targetBloom, fl.bloom + delta * 0.15); // gradual blooming
        }
      });

      // 9. Draw the Active Landscape with Weather Interactions
      drawCurrentLandscape(
        ctx,
        width,
        height,
        delta,
        effectiveWindVx,
        totalWindStrength,
        dark,
        floodLevelRef.current
      );

      // 10. Lightning Flash Ambient Overlay
      if (lightningFlashRef.current > 0) {
        ctx.fillStyle = `rgba(238, 242, 255, ${lightningFlashRef.current * 0.28})`;
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameIdRef.current = requestAnimationFrame(render);
    };

    animationFrameIdRef.current = requestAnimationFrame(render);
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [clouds, wind, landscape]);

  // Procedural Cloud Drawing
  const drawCloudBody = (ctx: CanvasRenderingContext2D, cloud: Cloud, isHovered: boolean) => {
    if (cloud.scale <= 0.05) return;
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    ctx.scale(cloud.scale, cloud.scale);

    const isStorm = cloud.type === 'storm';
    const isRain = cloud.type === 'rain';
    const isWispy = cloud.type === 'wispy';
    const isPuffy = cloud.type === 'puffy';

    // Hover outline indicator
    if (isHovered) {
      ctx.save();
      ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, (cloud.baseWidth / 2) + 12, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (isWispy) {
      // Wispy: thin, delicate, fast-moving, multi-curled cirrus lines
      const ribbons = 7;
      ctx.globalAlpha = cloud.opacity * 0.72;
      for (let r = 0; r < ribbons; r++) {
        const yOff = (r - ribbons / 2) * 5;
        const widthSpread = (cloud.baseWidth / 2) * (1 - Math.abs(r - ribbons / 2) * 0.18);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 4 + (r % 3) * 1.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-widthSpread, yOff);
        ctx.bezierCurveTo(
          -widthSpread * 0.4,
          yOff - 8 + (r % 2) * 4,
          widthSpread * 0.4,
          yOff + 5 - (r % 3) * 3,
          widthSpread,
          yOff - 4
        );
        ctx.stroke();
      }
    } else if (isPuffy) {
      // Puffy: round and slow-moving, gentle shade, warm white cumulus
      ctx.globalAlpha = cloud.opacity;
      const grad = ctx.createLinearGradient(0, -cloud.baseHeight / 2, 0, cloud.baseHeight / 2);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.65, '#f8fafc');
      grad.addColorStop(1, '#dbe2ef');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(148, 163, 184, 0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;

      cloud.puffs.forEach((puff) => {
        ctx.beginPath();
        ctx.arc(puff.dx, puff.dy, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Fluffy crowns
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.shadowBlur = 0;
      cloud.puffs.forEach((puff) => {
        ctx.beginPath();
        ctx.arc(puff.dx - puff.radius * 0.2, puff.dy - puff.radius * 0.28, puff.radius * 0.6, 0, Math.PI * 2);
        ctx.fill();
      });
    } else if (isRain) {
      // Rain: darker and fuller, slate-blue
      ctx.globalAlpha = cloud.opacity;
      const grad = ctx.createLinearGradient(0, -cloud.baseHeight / 2, 0, cloud.baseHeight / 2);
      grad.addColorStop(0, '#94a3b8');
      grad.addColorStop(0.55, '#64748b');
      grad.addColorStop(1, '#334155');

      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(15, 23, 42, 0.35)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 8;

      cloud.puffs.forEach((puff) => {
        ctx.beginPath();
        ctx.arc(puff.dx, puff.dy, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Moisture mist underside
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(0, cloud.baseHeight * 0.38, cloud.baseWidth * 0.42, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (isStorm) {
      // Storm: large and dramatic anvil shape, deep charcoal/violet/indigo
      ctx.globalAlpha = cloud.opacity;
      const stormGrad = ctx.createLinearGradient(0, -cloud.baseHeight / 2, 0, cloud.baseHeight / 2);
      stormGrad.addColorStop(0, '#64748b');
      stormGrad.addColorStop(0.3, '#334155');
      stormGrad.addColorStop(0.7, '#1e293b');
      stormGrad.addColorStop(1, '#0f172a');

      ctx.fillStyle = stormGrad;
      ctx.shadowColor = 'rgba(15, 23, 42, 0.5)';
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 12;

      // Anvil upper shelf
      ctx.beginPath();
      ctx.ellipse(0, -cloud.baseHeight * 0.32, cloud.baseWidth * 0.58, 25, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cloud puffs
      cloud.puffs.forEach((puff) => {
        ctx.beginPath();
        ctx.arc(puff.dx, puff.dy, puff.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // Internal gentle lantern-like lightning glow
      if (cloud.isFlashing && cloud.flashIntensity > 0) {
        ctx.save();
        ctx.shadowColor = '#fef08a';
        ctx.shadowBlur = 35 * cloud.flashIntensity;
        ctx.fillStyle = `rgba(254, 240, 138, ${0.85 * cloud.flashIntensity})`;
        ctx.beginPath();
        ctx.arc(0, -10, cloud.baseWidth * 0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * cloud.flashIntensity})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-15, -20);
        ctx.lineTo(-4, 0);
        ctx.lineTo(8, -5);
        ctx.lineTo(16, 22);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  };

  // Dispatch to the active landscape renderer
  const drawCurrentLandscape = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    delta: number,
    windVx: number,
    windStrength: number,
    dark: number,
    flood: number
  ) => {
    if (landscape === 'forest') {
      drawForest(ctx, width, height, delta, windVx, windStrength, dark, flood);
    } else if (landscape === 'village') {
      drawVillage(ctx, width, height, delta, windVx, windStrength, dark, flood);
    } else if (landscape === 'city') {
      drawCity(ctx, width, height, delta, windVx, windStrength, dark, flood);
    } else {
      drawIsland(ctx, width, height, delta, windVx, windStrength, dark, flood);
    }

    // Draw swaying flowers for all landscapes
    drawFlowers(ctx, windVx, windStrength);
  };

  // Helper: Draw Fluttering Flag
  const drawFlag = (
    ctx: CanvasRenderingContext2D,
    poleX: number,
    poleY: number,
    poleHeight: number,
    flagColor: string,
    windVx: number,
    windStrength: number
  ) => {
    ctx.save();
    // Pole
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(poleX, poleY);
    ctx.lineTo(poleX, poleY - poleHeight);
    ctx.stroke();

    // Flag wave
    const flagTopY = poleY - poleHeight + 2;
    const flagLen = 22;
    const flagH = 14;
    const dir = windVx >= 0 ? 1 : -1;
    const amp = (windStrength > 0.2 ? 3.5 : 1.2) * (1 + windStrength * 0.8);
    const phase = flagPhaseRef.current;

    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(poleX, flagTopY);

    // Top wavy edge
    for (let i = 0; i <= flagLen; i += 4) {
      const x = poleX + i * dir;
      const wave = Math.sin(phase + i * 0.35) * amp;
      ctx.lineTo(x, flagTopY + wave);
    }

    // Bottom wavy edge back
    for (let i = flagLen; i >= 0; i -= 4) {
      const x = poleX + i * dir;
      const wave = Math.sin(phase + i * 0.35) * amp;
      ctx.lineTo(x, flagTopY + flagH + wave);
    }
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // 1. FOREST LANDSCAPE
  const drawForest = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    delta: number,
    windVx: number,
    windStrength: number,
    dark: number,
    flood: number
  ) => {
    // Distant mountain ridges
    const ridgeGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    ridgeGrad.addColorStop(0, '#334155');
    ridgeGrad.addColorStop(1, '#1e293b');
    ctx.fillStyle = ridgeGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.68);
    for (let x = 0; x <= width; x += 40) {
      const y = height * 0.68 + Math.sin((x / width) * Math.PI * 3.5) * (height * 0.05);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Main rolling mossy forest floor
    const forestGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
    forestGrad.addColorStop(0, '#15803d');
    forestGrad.addColorStop(0.4, '#166534');
    forestGrad.addColorStop(1, '#14532d');
    ctx.fillStyle = forestGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, getGroundY(0, width, height));
    for (let x = 0; x <= width; x += 15) {
      ctx.lineTo(x, getGroundY(x, width, height));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Winding forest creek in middle
    const creekX = width * 0.62;
    const creekY = getGroundY(creekX, width, height) + 14;
    const baseCreekW = 75;
    // Temporary high-water flood expands creek during storms
    const creekW = baseCreekW + flood * 70;
    const creekH = 16 + flood * 14;

    const creekGrad = ctx.createLinearGradient(creekX - creekW, creekY, creekX + creekW, creekY);
    creekGrad.addColorStop(0, '#38bdf8');
    creekGrad.addColorStop(0.5, '#0284c7');
    creekGrad.addColorStop(1, '#0369a1');
    ctx.fillStyle = creekGrad;
    ctx.beginPath();
    ctx.ellipse(creekX, creekY, creekW, creekH, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Creek bank pebbles
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.ellipse(creekX - creekW * 0.8, creekY - 4, 7, 3.5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(creekX + creekW * 0.75, creekY - 2, 9, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Stream water gleam
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(creekX - 12, creekY - 2, 25, 0.2, 1.2);
    ctx.stroke();

    // Forest Ranger Watchtower & Flag on left ridge
    const towerX = width * 0.2;
    const towerY = getGroundY(towerX, width, height) - 2;
    // Timber legs
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(towerX - 10, towerY);
    ctx.lineTo(towerX - 6, towerY - 38);
    ctx.lineTo(towerX + 6, towerY - 38);
    ctx.lineTo(towerX + 10, towerY);
    ctx.stroke();

    // Cross braces
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(towerX - 9, towerY - 14);
    ctx.lineTo(towerX + 9, towerY - 24);
    ctx.moveTo(towerX + 9, towerY - 14);
    ctx.lineTo(towerX - 9, towerY - 24);
    ctx.stroke();

    // Lookout cabin
    ctx.fillStyle = '#92400e';
    ctx.beginPath();
    ctx.roundRect(towerX - 12, towerY - 52, 24, 14, [2, 2, 0, 0]);
    ctx.fill();

    // Cozy warm cabin window (glows brighter as skies darken)
    const windowGlow = 0.35 + dark * 0.65;
    ctx.fillStyle = `rgba(251, 191, 36, ${windowGlow})`;
    ctx.fillRect(towerX - 4, towerY - 48, 8, 7);

    // Pyramid roof
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.moveTo(towerX - 15, towerY - 52);
    ctx.lineTo(towerX, towerY - 64);
    ctx.lineTo(towerX + 15, towerY - 52);
    ctx.closePath();
    ctx.fill();

    // Forest flag fluttering atop tower
    drawFlag(ctx, towerX, towerY - 64, 16, '#10b981', windVx, windStrength);

    // Layered Forest Trees (Pines and leafy trees)
    const pines = [
      { x: width * 0.08, scale: 1.1 },
      { x: width * 0.34, scale: 0.95 },
      { x: width * 0.44, scale: 1.15 },
      { x: width * 0.82, scale: 1.05 },
      { x: width * 0.92, scale: 1.2 },
    ];
    pines.forEach((p) => {
      const py = getGroundY(p.x, width, height) - 2;
      drawPineTree(ctx, p.x, py, p.scale, windVx * 0.14, windStrength);
    });
  };

  // Helper: Draw Pine Tree with wind sway
  const drawPineTree = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    swayTilt: number,
    windStrength: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -18);
    ctx.stroke();

    // Conical evergreen tiers that sway
    const time = performance.now() * 0.002;
    const flutter = Math.sin(time + x) * (0.04 + windStrength * 0.1);
    ctx.translate(0, -14);
    ctx.rotate(swayTilt + flutter);

    const pineColors = ['#14532d', '#166534', '#15803d'];
    const tiers = [
      { y: 0, w: 32, h: 18, c: 0 },
      { y: -12, w: 26, h: 16, c: 1 },
      { y: -24, w: 18, h: 15, c: 2 },
    ];
    tiers.forEach((t) => {
      ctx.fillStyle = pineColors[t.c];
      ctx.beginPath();
      ctx.moveTo(-t.w / 2, t.y);
      ctx.lineTo(0, t.y - t.h);
      ctx.lineTo(t.w / 2, t.y);
      ctx.closePath();
      ctx.fill();
    });

    ctx.restore();
  };

  // 2. VILLAGE LANDSCAPE
  const drawVillage = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    delta: number,
    windVx: number,
    windStrength: number,
    dark: number,
    flood: number
  ) => {
    // Distant vineyard hills
    const hillGrad = ctx.createLinearGradient(0, height * 0.65, 0, height);
    hillGrad.addColorStop(0, '#5b8296');
    hillGrad.addColorStop(1, '#3a5a6a');
    ctx.fillStyle = hillGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.72);
    for (let x = 0; x <= width; x += 30) {
      const y = height * 0.72 + Math.cos((x / width) * Math.PI * 2.2) * (height * 0.04);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Rolling village meadow
    const meadowGrad = ctx.createLinearGradient(0, height * 0.72, 0, height);
    meadowGrad.addColorStop(0, '#4ade80');
    meadowGrad.addColorStop(0.35, '#22c55e');
    meadowGrad.addColorStop(1, '#15803d');
    ctx.fillStyle = meadowGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, getGroundY(0, width, height));
    for (let x = 0; x <= width; x += 15) {
      ctx.lineTo(x, getGroundY(x, width, height));
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Cobblestone path winding across the village
    const pathY = getGroundY(width * 0.5, width, height) + 12;
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.ellipse(width * 0.5, pathY, width * 0.45, 14, 0.03, 0, Math.PI * 2);
    ctx.fill();

    // Puddle and temporary storm flood on village path
    if (flood > 0.05) {
      const puddleW = 45 + flood * 60;
      const puddleH = 10 + flood * 10;
      const puddleX = width * 0.52;
      const puddleY = pathY + 2;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.beginPath();
      ctx.ellipse(puddleX, puddleY, puddleW, puddleH, 0.02, 0, Math.PI * 2);
      ctx.fill();

      // Ripple reflections
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(puddleX - 10, puddleY - 1, 14, 0, Math.PI);
      ctx.stroke();
    }

    // Windmill on left crest
    const millX = width * 0.18;
    const millY = getGroundY(millX, width, height) - 4;
    const spinRate = (windVx === 0 ? 0.35 : windVx * 1.8);
    windmillAngleRef.current += spinRate * delta;
    drawWindmill(ctx, millX, millY, windmillAngleRef.current);

    // Village Cottages with Glowing Windows
    const cottages = [
      { x: width * 0.42, w: 46, h: 32, roof: '#b45309', chimney: true },
      { x: width * 0.64, w: 56, h: 36, roof: '#991b1b', chimney: true },
      { x: width * 0.82, w: 42, h: 28, roof: '#b45309', chimney: false },
    ];
    cottages.forEach((c) => {
      const cy = getGroundY(c.x, width, height) - 2;
      drawCottage(ctx, c.x, cy, c.w, c.h, c.roof, c.chimney, dark, windVx);
    });

    // Village Steeple / Town Hall with fluttering banner flag
    const steepleX = width * 0.64;
    const steepleY = getGroundY(steepleX, width, height) - 38;
    drawFlag(ctx, steepleX, steepleY, 20, '#ef4444', windVx, windStrength);
  };

  // Helper: Draw Cozy Cottage
  const drawCottage = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    roofColor: string,
    hasChimney: boolean,
    dark: number,
    windVx: number
  ) => {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 4, w * 0.65, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chimney & smoke
    if (hasChimney) {
      const chimX = w * 0.25;
      const chimY = -h - 10;
      ctx.fillStyle = '#78350f';
      ctx.fillRect(chimX - 3, chimY, 6, 14);

      // Chimney smoke puff drifting with wind
      const time = performance.now() * 0.002;
      const smokeDrift = windVx * 12;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(chimX + smokeDrift * 0.5, chimY - 6, 5, 0, Math.PI * 2);
      ctx.arc(chimX + smokeDrift * 1.2, chimY - 14, 7, 0, Math.PI * 2);
      ctx.arc(chimX + smokeDrift * 2.0, chimY - 24, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Walls
    const wallGrad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    wallGrad.addColorStop(0, '#fef3c7');
    wallGrad.addColorStop(0.7, '#fde68a');
    wallGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = wallGrad;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, h, [0, 0, 2, 2]);
    ctx.fill();

    // Wooden door
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(-5, -16, 10, 16, [3, 3, 0, 0]);
    ctx.fill();

    // Cozy Glowing Windows (glows intensely in dark storms!)
    const windowGlow = 0.35 + dark * 0.65;
    ctx.fillStyle = `rgba(251, 191, 36, ${windowGlow})`;
    ctx.fillRect(-w * 0.35, -h * 0.65, 8, 8);
    ctx.fillRect(w * 0.35 - 8, -h * 0.65, 8, 8);

    // Window cross frame
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w * 0.35, -h * 0.65, 8, 8);
    ctx.strokeRect(w * 0.35 - 8, -h * 0.65, 8, 8);

    // Gabled Roof
    ctx.fillStyle = roofColor;
    ctx.beginPath();
    ctx.moveTo(-w / 2 - 6, -h);
    ctx.lineTo(0, -h - 18);
    ctx.lineTo(w / 2 + 6, -h);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  // Helper: Draw Windmill
  const drawWindmill = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    ctx.save();
    ctx.translate(x, y);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 4, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    const towerW = 26;
    const towerH = 46;
    const bodyGrad = ctx.createLinearGradient(-towerW / 2, 0, towerW / 2, 0);
    bodyGrad.addColorStop(0, '#f1f5f9');
    bodyGrad.addColorStop(0.65, '#e2e8f0');
    bodyGrad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-towerW / 2, 0);
    ctx.lineTo(-towerW * 0.35, -towerH);
    ctx.lineTo(towerW * 0.35, -towerH);
    ctx.lineTo(towerW / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.roundRect(-4.5, -14, 9, 14, [4, 4, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(-towerW * 0.45, -towerH);
    ctx.lineTo(0, -towerH - 16);
    ctx.lineTo(towerW * 0.45, -towerH);
    ctx.closePath();
    ctx.fill();

    const rotorY = -towerH + 4;
    ctx.save();
    ctx.translate(0, rotorY);
    ctx.rotate(angle);

    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2.2;
    ctx.fillStyle = 'rgba(254, 243, 199, 0.9)';

    const bladeLen = 32;
    for (let b = 0; b < 4; b++) {
      ctx.rotate(Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -bladeLen);
      ctx.stroke();

      ctx.beginPath();
      ctx.roundRect(1.5, -bladeLen + 4, 7.5, bladeLen - 10, [1, 1, 1, 1]);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  };

  // 3. CITY LANDSCAPE
  const drawCity = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    delta: number,
    windVx: number,
    windStrength: number,
    dark: number,
    flood: number
  ) => {
    // Distant background skyline silhouettes
    ctx.fillStyle = '#334155';
    const bgBuildings = [
      { x: width * 0.05, w: 55, h: 110 },
      { x: width * 0.22, w: 45, h: 90 },
      { x: width * 0.38, w: 60, h: 130 },
      { x: width * 0.58, w: 50, h: 105 },
      { x: width * 0.76, w: 70, h: 120 },
      { x: width * 0.88, w: 55, h: 95 },
    ];
    bgBuildings.forEach((b) => {
      ctx.fillRect(b.x, height * 0.76 - b.h, b.w, b.h + 20);
    });

    // Main urban ground / boulevard
    const streetGrad = ctx.createLinearGradient(0, height * 0.76, 0, height);
    streetGrad.addColorStop(0, '#1e293b');
    streetGrad.addColorStop(0.3, '#334155');
    streetGrad.addColorStop(1, '#0f172a');
    ctx.fillStyle = streetGrad;
    ctx.fillRect(0, height * 0.76, width, height * 0.24);

    // Sidewalk curb
    ctx.fillStyle = '#64748b';
    ctx.fillRect(0, height * 0.76 - 3, width, 5);

    // Midground Detailed Buildings with Glowing Windows
    const buildings = [
      { x: width * 0.12, w: 68, h: 75, color: '#475569', windows: 3, rows: 3 },
      { x: width * 0.28, w: 80, h: 105, color: '#334155', windows: 4, rows: 4, isClockTower: true },
      { x: width * 0.48, w: 72, h: 80, color: '#475569', windows: 3, rows: 3 },
      { x: width * 0.65, w: 85, h: 95, color: '#1e293b', windows: 4, rows: 4 },
      { x: width * 0.82, w: 65, h: 70, color: '#334155', windows: 3, rows: 3 },
    ];

    const windowGlow = 0.3 + dark * 0.7; // Brighter golden glow during dark storms

    buildings.forEach((b) => {
      const by = height * 0.76 - b.h;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, by, b.w, b.h);

      // Roof cornice trim
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(b.x - 3, by - 4, b.w + 6, 6);

      // If clock tower
      if (b.isClockTower) {
        // Clock face
        const clockX = b.x + b.w / 2;
        const clockY = by + 22;
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(clockX, clockY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Spire & Municipal flag fluttering
        const spireH = 26;
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(clockX - 10, by);
        ctx.lineTo(clockX, by - spireH);
        ctx.lineTo(clockX + 10, by);
        ctx.closePath();
        ctx.fill();

        drawFlag(ctx, clockX, by - spireH, 18, '#3b82f6', windVx, windStrength);
      }

      // Grid of illuminated warm windows
      ctx.fillStyle = `rgba(251, 191, 36, ${windowGlow})`;
      const colW = b.w / (b.windows + 1);
      const rowH = (b.h - (b.isClockTower ? 45 : 15)) / (b.rows + 1);
      const startY = by + (b.isClockTower ? 45 : 12);

      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.windows; c++) {
          const wx = b.x + colW * (c + 1) - 4;
          const wy = startY + rowH * r;
          ctx.fillRect(wx, wy, 8, 9);
        }
      }
    });

    // Street Lamps with warm lantern cones
    const lamps = [width * 0.22, width * 0.44, width * 0.78];
    lamps.forEach((lx) => {
      const ly = height * 0.76;
      // Post
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(lx, ly);
      ctx.lineTo(lx, ly - 32);
      ctx.stroke();

      // Lamp head
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(lx, ly - 32, 4, 0, Math.PI * 2);
      ctx.fill();

      // Light beam cone on ground (visible as sky darkens)
      if (dark > 0.2) {
        ctx.fillStyle = `rgba(254, 240, 138, ${0.15 + dark * 0.35})`;
        ctx.beginPath();
        ctx.moveTo(lx, ly - 32);
        ctx.lineTo(lx - 20, ly + 2);
        ctx.lineTo(lx + 20, ly + 2);
        ctx.closePath();
        ctx.fill();
      }
    });

    // Street puddles and temporary storm flood
    if (flood > 0.05) {
      const puddleW = width * 0.35 + flood * (width * 0.3);
      const puddleH = 10 + flood * 12;
      const puddleX = width * 0.55;
      const puddleY = height * 0.76 + 18;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.beginPath();
      ctx.ellipse(puddleX, puddleY, puddleW / 2, puddleH, 0, 0, Math.PI * 2);
      ctx.fill();

      // Building reflection gleam on wet street
      ctx.fillStyle = `rgba(251, 191, 36, ${0.15 * windowGlow})`;
      ctx.fillRect(puddleX - 40, puddleY - 4, 80, 8);
    }
  };

  // 4. TROPICAL ISLAND LANDSCAPE
  const drawIsland = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    delta: number,
    windVx: number,
    windStrength: number,
    dark: number,
    flood: number
  ) => {
    // Distant volcanic island silhouette
    const volcanoGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
    volcanoGrad.addColorStop(0, '#065f46');
    volcanoGrad.addColorStop(1, '#047857');
    ctx.fillStyle = volcanoGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * 0.72);
    ctx.lineTo(width * 0.15, height * 0.58);
    ctx.lineTo(width * 0.35, height * 0.72);
    ctx.lineTo(width, height * 0.74);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Turquoise Tropical Ocean / Lagoon (swells during storm flood)
    const seaY = height * 0.77 - flood * 10;
    const oceanGrad = ctx.createLinearGradient(0, seaY, 0, height);
    oceanGrad.addColorStop(0, '#38bdf8');
    oceanGrad.addColorStop(0.3, '#06b6d4');
    oceanGrad.addColorStop(1, '#0891b2');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, seaY, width, height - seaY);

    // Dynamic rhythmic ocean waves driven by wind
    const time = performance.now() * 0.003;
    const waveSpeed = time * (windVx === 0 ? 1 : windVx * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.lineWidth = 1.6;
    for (let w = 0; w < 3; w++) {
      const wy = seaY + 8 + w * 12;
      ctx.beginPath();
      for (let x = 0; x <= width; x += 20) {
        const wave = Math.sin((x / 30) - waveSpeed + w) * 3;
        if (x === 0) ctx.moveTo(x, wy + wave);
        else ctx.lineTo(x, wy + wave);
      }
      ctx.stroke();
    }

    // Sandy Curved Beach Mound on left & center
    const sandGrad = ctx.createLinearGradient(0, height * 0.73, 0, height);
    sandGrad.addColorStop(0, '#fef08a');
    sandGrad.addColorStop(0.4, '#fde047');
    sandGrad.addColorStop(1, '#eab308');
    ctx.fillStyle = sandGrad;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, getGroundY(0, width, height));
    for (let x = 0; x <= width * 0.75; x += 15) {
      ctx.lineTo(x, getGroundY(x, width, height));
    }
    // Sand curves gently into the lagoon
    ctx.lineTo(width * 0.82, height);
    ctx.closePath();
    ctx.fill();

    // Wooden Pier / Tiki Hut & Island Flag
    const pierX = width * 0.72;
    const pierY = seaY - 2;
    // Stilted wooden pilings
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(pierX - 12, pierY);
    ctx.lineTo(pierX - 12, pierY + 25);
    ctx.moveTo(pierX + 12, pierY);
    ctx.lineTo(pierX + 12, pierY + 25);
    ctx.stroke();

    // Pier plank deck
    ctx.fillStyle = '#92400e';
    ctx.fillRect(pierX - 22, pierY - 4, 44, 6);

    // Thatched tiki hut roof
    ctx.fillStyle = '#b45309';
    ctx.beginPath();
    ctx.moveTo(pierX - 18, pierY - 14);
    ctx.lineTo(pierX, pierY - 30);
    ctx.lineTo(pierX + 18, pierY - 14);
    ctx.closePath();
    ctx.fill();

    // Colorful Island Nautical Flag
    drawFlag(ctx, pierX, pierY - 30, 16, '#f97316', windVx, windStrength);

    // Palm Trees with wind-responsive bending fronds
    const palms = [
      { x: width * 0.16, scale: 1.15, lean: -0.15 },
      { x: width * 0.36, scale: 1.0, lean: 0.12 },
      { x: width * 0.52, scale: 0.95, lean: 0.22 },
    ];
    palms.forEach((p) => {
      const py = getGroundY(p.x, width, height) - 2;
      drawPalmTree(ctx, p.x, py, p.scale, p.lean, windVx * 0.18, windStrength);
    });
  };

  // Helper: Draw Palm Tree
  const drawPalmTree = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    scale: number,
    naturalLean: number,
    windTilt: number,
    windStrength: number
  ) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // Shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 3, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Curved Trunk
    const trunkH = 55;
    const effectiveLean = naturalLean + windTilt;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(effectiveLean * 20, -trunkH * 0.5, effectiveLean * 35, -trunkH);
    ctx.stroke();

    // Palm Crown & Fronds
    ctx.translate(effectiveLean * 35, -trunkH);
    const time = performance.now() * 0.003;
    const flutter = Math.sin(time + x) * (0.05 + windStrength * 0.15);
    ctx.rotate(effectiveLean * 0.4 + flutter);

    // Coconuts
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(-3, 2, 4, 0, Math.PI * 2);
    ctx.arc(3, 3, 4, 0, Math.PI * 2);
    ctx.fill();

    // 5 Long curved palm fronds
    const frondAngles = [-1.8, -0.9, -0.2, 0.7, 1.6];
    ctx.lineWidth = 2.5;
    frondAngles.forEach((fa) => {
      const angle = fa + windTilt * 0.5;
      const frondLen = 32;
      const endX = Math.cos(angle) * frondLen;
      const endY = Math.sin(angle) * frondLen + 8; // fronds droop gracefully

      ctx.strokeStyle = '#15803d';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(endX * 0.5, endY - 8, endX, endY);
      ctx.stroke();

      // Frond leaves feathering
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.ellipse(endX * 0.6, endY * 0.6, 9, 3.5, angle, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  };

  // Helper: Draw blooming wildflowers (gradually blooming after rain)
  const drawFlowers = (
    ctx: CanvasRenderingContext2D,
    windVx: number,
    windStrength: number
  ) => {
    flowersRef.current.forEach((fl) => {
      const sway = Math.sin(fl.swayOffset + performance.now() * 0.003) * (3 + windStrength * 8) + (windVx * 4);
      const topX = fl.x + sway;
      const topY = fl.y - fl.stemHeight;

      // Stem
      ctx.strokeStyle = '#166534';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(fl.x, fl.y);
      ctx.quadraticCurveTo(fl.x + sway * 0.5, fl.y - fl.stemHeight * 0.5, topX, topY);
      ctx.stroke();

      // Flower petals (size scales dynamically with bloom: modest bud -> radiant open blossom!)
      const petalSize = 2.2 + fl.bloom * 3.2;
      ctx.fillStyle = fl.color;
      for (let p = 0; p < 5; p++) {
        const pAngle = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(
          topX + Math.cos(pAngle) * petalSize,
          topY + Math.sin(pAngle) * petalSize,
          petalSize * 0.85,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Center pistil
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(topX, topY, petalSize * 0.5, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // Find cloud under pointer
  const getCloudAtPos = (clientX: number, clientY: number): Cloud | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    for (let i = clouds.length - 1; i >= 0; i--) {
      const c = clouds[i];
      if (c.dissolving) continue;
      const hitRadius = (c.baseWidth * c.scale) / 2 + 15;
      const dist = Math.hypot(c.x - x, c.y - y);
      if (dist <= hitRadius) {
        return c;
      }
    }
    return null;
  };

  // Pointer event handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    isPointerDownRef.current = true;
    pointerStartPos.current = { x, y };

    const hitCloud = getCloudAtPos(e.clientX, e.clientY);
    if (hitCloud) {
      draggedCloudIdRef.current = hitCloud.id;
      setCursorStyle('grab');
    } else {
      draggedCloudIdRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hitCloud = getCloudAtPos(e.clientX, e.clientY);
    hoveredCloudIdRef.current = hitCloud ? hitCloud.id : null;

    if (isPointerDownRef.current && draggedCloudIdRef.current) {
      const cloud = clouds.find((c) => c.id === draggedCloudIdRef.current);
      if (cloud && !cloud.dissolving) {
        cloud.x = x;
        cloud.y = y;
      }
    }

    if (hitCloud) {
      setCursorStyle('pointer');
    } else {
      setCursorStyle('crosshair');
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dragDist = Math.hypot(x - pointerStartPos.current.x, y - pointerStartPos.current.y);

    if (dragDist < 8) {
      const hitCloud = getCloudAtPos(e.clientX, e.clientY);
      if (hitCloud) {
        onCloudClick(hitCloud.id);
      } else {
        const groundY = getGroundY(x, rect.width, rect.height);
        if (y < groundY - 20) {
          onSkyClick(x, y);
        }
      }
    }

    isPointerDownRef.current = false;
    draggedCloudIdRef.current = null;
    setCursorStyle(hoveredCloudIdRef.current ? 'pointer' : 'crosshair');
  };

  return (
    <div ref={containerRef} className="relative w-full h-full select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ cursor: cursorStyle }}
        className="w-full h-full block touch-none"
      />
    </div>
  );
};
