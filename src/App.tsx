/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WindDirection, CloudType, LandscapeType, Cloud } from './types';
import { createCloud, createDefaultPreset } from './utils/cloudGenerator';
import { WeatherCanvas } from './components/WeatherCanvas';
import { ControlDock } from './components/ControlDock';
import { sound } from './audio';

export default function App() {
  const [landscape, setLandscape] = useState<LandscapeType>('village');
  const [wind, setWind] = useState<WindDirection>('right');
  const [selectedCloudType, setSelectedCloudType] = useState<CloudType>('puffy');
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const cloudCountPitchRef = useRef(0);

  // Initialize with peaceful starter clouds on mount
  useEffect(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    setClouds(createDefaultPreset(w, h));
  }, []);

  // Cleanup completely dissolved clouds periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setClouds((prev) => prev.filter((c) => !c.dissolving || c.scale > 0.01));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Tap on sky: spawn selected cloud type
  const handleSkyClick = useCallback(
    (x: number, y: number) => {
      const newCloud = createCloud(selectedCloudType, x, y, 1.0, true);
      setClouds((prev) => [...prev, newCloud]);
      cloudCountPitchRef.current++;
      sound.playSpawnChime(cloudCountPitchRef.current);
    },
    [selectedCloudType]
  );

  // Tap on cloud: dissolve it peacefully
  const handleCloudClick = useCallback((cloudId: string) => {
    setClouds((prev) =>
      prev.map((c) => {
        if (c.id === cloudId) {
          return { ...c, dissolving: true };
        }
        return c;
      })
    );
    sound.playDisperseChime();
  }, []);

  // Reset: clear all clouds
  const handleReset = useCallback(() => {
    setClouds((prev) =>
      prev.map((c) => ({
        ...c,
        dissolving: true,
      }))
    );
    sound.playDisperseChime();
  }, []);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const enabled = sound.toggle();
    setSoundEnabled(enabled);
  }, []);

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-900 select-none flex flex-col justify-between">
      {/* 2D Living Weather & Landscape Canvas (Fills entire screen) */}
      <div className="absolute inset-0 z-0">
        <WeatherCanvas
          landscape={landscape}
          wind={wind}
          selectedCloudType={selectedCloudType}
          clouds={clouds}
          onCloudClick={handleCloudClick}
          onSkyClick={handleSkyClick}
        />
      </div>

      {/* Top Header: Quiet title and single instruction */}
      <header className="relative z-10 w-full pt-3 sm:pt-5 px-4 flex flex-col items-center pointer-events-none text-center">
        <h1 className="text-xs sm:text-sm font-semibold tracking-widest uppercase text-white/90 drop-shadow-md">
          Cloud Shepherd
        </h1>
        <p className="mt-0.5 text-xs sm:text-sm font-normal text-white/75 drop-shadow-sm tracking-wide">
          Tap the sky to guide the weather · Tap a cloud to let it go
        </p>
      </header>

      {/* Bottom Controls: Compact single row */}
      <div className="relative z-10 w-full flex justify-center pointer-events-none pb-1 sm:pb-3">
        <ControlDock
          landscape={landscape}
          onSelectLandscape={setLandscape}
          wind={wind}
          onSelectWind={setWind}
          selectedCloudType={selectedCloudType}
          onSelectCloudType={setSelectedCloudType}
          onReset={handleReset}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      </div>
    </main>
  );
}
