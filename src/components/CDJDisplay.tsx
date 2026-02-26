/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { WinampVisualizer } from './WinampVisualizer';

interface CDJDisplayProps {
  currentTime: number;
  duration: number;
  pitch: number;
  trackName: string;
  bpm: number;
  trackIndex: number;
  totalTracks: number;
  analyser: AnalyserNode | null;
  vizColor: string;
  vizOpacity: number;
}

export const CDJDisplay: React.FC<CDJDisplayProps> = ({
  currentTime,
  duration,
  pitch,
  trackName,
  bpm,
  trackIndex,
  totalTracks,
  analyser,
  vizColor,
  vizOpacity
}) => {
  const [vizMode, setVizMode] = useState<'spectrum' | 'oscilloscope' | 'milkdrop'>('spectrum');

  const toggleVizMode = () => {
    const modes: ('spectrum' | 'oscilloscope' | 'milkdrop')[] = ['spectrum', 'oscilloscope', 'milkdrop'];
    const currentIndex = modes.indexOf(vizMode);
    setVizMode(modes[(currentIndex + 1) % modes.length]);
  };
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 75); // CDJ style 75 frames per second
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const remaining = duration - currentTime;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const seekTime = percentage * duration;
    // We need to pass this up to the parent
    (window as any).dispatchEvent(new CustomEvent('cdj-seek', { detail: seekTime }));
  };

  return (
    <div 
      className="bg-[#050505] border-2 sm:border-4 border-[#222] rounded-sm p-2 sm:p-4 w-full h-36 sm:h-44 flex flex-col justify-between shadow-inner relative overflow-hidden cursor-pointer"
      onClick={toggleVizMode}
    >
      {/* LCD Glow Effect */}
      <div className="absolute inset-0 bg-orange-500/[0.03] pointer-events-none" />
      
      {/* Winamp Visualizer Background */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{ opacity: vizOpacity }}>
        <WinampVisualizer analyser={analyser} mode={vizMode} color={vizColor} />
      </div>
      
      <div className="flex justify-between items-start relative z-10">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-[8px] sm:text-[10px] text-orange-400/40 uppercase font-mono">Track</span>
            <span className="text-orange-500 font-mono text-xl sm:text-2xl leading-none">
              {(trackIndex + 1).toString().padStart(2, '0')}
            </span>
            <span className="text-[8px] sm:text-[10px] text-orange-400/20 font-mono">/ {totalTracks.toString().padStart(2, '0')}</span>
          </div>
          <span className="text-orange-500/80 font-mono text-[8px] sm:text-[10px] truncate max-w-[120px] sm:max-w-[180px] mt-1 uppercase tracking-tighter">
            {trackName || "NO DISC"}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[8px] sm:text-[10px] text-orange-400/40 uppercase font-mono">Tempo</span>
          <span className="text-orange-500 font-mono text-xl sm:text-2xl leading-none">
            {pitch >= 0 ? '+' : ''}{(pitch * 100).toFixed(1)}
          </span>
          <span className="text-[7px] sm:text-[8px] text-orange-400/20 font-mono mt-1">BPM: {bpm.toFixed(1)}</span>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-0 sm:py-1 relative z-10">
        <div className="flex items-baseline gap-2 sm:gap-3">
          <span className="text-orange-500 font-mono text-3xl sm:text-5xl tracking-tighter drop-shadow-[0_0_8px_rgba(249,115,22,0.3)]">
            {formatTime(currentTime)}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div 
          className="w-full h-1.5 sm:h-2 bg-[#111] mt-2 sm:mt-3 relative overflow-hidden rounded-full border border-white/5 cursor-crosshair"
          onClick={(e) => {
            e.stopPropagation();
            handleProgressClick(e);
          }}
        >
          <motion.div 
            className="absolute top-0 left-0 h-full bg-orange-500 shadow-[0_0_12px_rgba(249,115,22,0.6)]"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-end relative z-10">
        <div className="flex gap-2 sm:gap-4">
          <div className="flex flex-col items-center">
            <span className="text-[7px] sm:text-[8px] text-orange-400/40 uppercase font-mono mb-0.5 sm:mb-1">A.Cue</span>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-orange-500 shadow-[0_0_4px_orange]" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[7px] sm:text-[8px] text-orange-400/40 uppercase font-mono mb-0.5 sm:mb-1">M.Tempo</span>
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#222]" />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-[8px] sm:text-[10px] text-orange-500 font-mono uppercase tracking-widest animate-pulse">
            Digital Jog Break
          </div>
        </div>
      </div>
    </div>
  );
};
