/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { WindDirection, CloudType, LandscapeType } from '../types';
import {
  Trees,
  Home,
  Building2,
  Palmtree,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Wind,
  Feather,
  Cloud,
  CloudRain,
  CloudLightning,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface ControlDockProps {
  landscape: LandscapeType;
  onSelectLandscape: (landscape: LandscapeType) => void;
  wind: WindDirection;
  onSelectWind: (wind: WindDirection) => void;
  selectedCloudType: CloudType;
  onSelectCloudType: (type: CloudType) => void;
  onReset: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ControlDock: React.FC<ControlDockProps> = ({
  landscape,
  onSelectLandscape,
  wind,
  onSelectWind,
  selectedCloudType,
  onSelectCloudType,
  onReset,
  soundEnabled,
  onToggleSound,
}) => {
  return (
    <footer className="w-full max-w-5xl px-2 sm:px-4 pb-3 sm:pb-4 pointer-events-auto flex justify-center">
      <div className="flex items-center flex-wrap justify-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-slate-900/80 backdrop-blur-md border border-white/15 rounded-2xl shadow-2xl max-w-full">
        
        {/* Landscape Selector Group */}
        <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Landscape selection">
          <button
            type="button"
            onClick={() => onSelectLandscape('forest')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              landscape === 'forest'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Forest landscape"
          >
            <Trees className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="inline">Forest</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectLandscape('village')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              landscape === 'village'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Village landscape"
          >
            <Home className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="inline">Village</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectLandscape('city')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              landscape === 'city'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="City landscape"
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="inline">City</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectLandscape('island')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              landscape === 'island'
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Tropical Island landscape"
          >
            <Palmtree className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="inline">Island</span>
          </button>
        </div>

        {/* Hairline Divider */}
        <div className="hidden md:block w-px h-5 bg-white/20 mx-0.5" />

        {/* Wind Group */}
        <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Wind direction controls">
          <button
            type="button"
            onClick={() => onSelectWind('left')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              wind === 'left'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Wind blowing left"
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Left</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectWind('calm')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              wind === 'calm'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Calm stillness"
          >
            <Wind className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Calm</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectWind('right')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              wind === 'right'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Wind blowing right"
          >
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Right</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectWind('up')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              wind === 'up'
                ? 'bg-sky-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Updraft"
          >
            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Up</span>
          </button>
        </div>

        {/* Hairline Divider */}
        <div className="hidden md:block w-px h-5 bg-white/20 mx-0.5" />

        {/* Cloud Types Group */}
        <div className="flex items-center gap-0.5 sm:gap-1" role="group" aria-label="Cloud weather controls">
          <button
            type="button"
            onClick={() => onSelectCloudType('wispy')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              selectedCloudType === 'wispy'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Wispy: thin, delicate, fast-moving"
          >
            <Feather className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Wispy</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCloudType('puffy')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              selectedCloudType === 'puffy'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Puffy: round, slow-moving, gentle shade"
          >
            <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Puffy</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCloudType('rain')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              selectedCloudType === 'rain'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Rain: ordinary rain, helps flowers bloom"
          >
            <CloudRain className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Rain</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectCloudType('storm')}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              selectedCloudType === 'storm'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
            title="Storm: dramatic clouds, heavy rain, dark skies, gentle lightning"
          >
            <CloudLightning className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span>Storm</span>
          </button>
        </div>

        {/* Hairline Divider */}
        <div className="hidden md:block w-px h-5 bg-white/20 mx-0.5" />

        {/* Actions: Reset & Sound */}
        <div className="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-slate-300 hover:text-rose-200 hover:bg-rose-500/20 transition-all"
            title="Clear the sky"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="hidden sm:inline">Clear</span>
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              soundEnabled
                ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
            title={soundEnabled ? 'Mute ambient sound' : 'Enable gentle ambient sound'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            )}
          </button>
        </div>

      </div>
    </footer>
  );
};
