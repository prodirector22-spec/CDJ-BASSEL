/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { JogMode } from '../types';

interface JogWheelProps {
  mode: JogMode;
  onRotate: (delta: number) => void;
  onInteractionStart: () => void;
  onInteractionEnd: () => void;
}

export const JogWheel: React.FC<JogWheelProps> = ({
  mode,
  onRotate,
  onInteractionStart,
  onInteractionEnd
}) => {
  const [rotation, setRotation] = useState(0);
  const isInteracting = useRef(false);
  const lastAngle = useRef(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  const getAngle = (clientX: number, clientY: number) => {
    if (!wheelRef.current) return 0;
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI);
  };

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    isInteracting.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastAngle.current = getAngle(clientX, clientY);
    onInteractionStart();
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isInteracting.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const currentAngle = getAngle(clientX, clientY);
      let delta = currentAngle - lastAngle.current;
      
      // Handle wrap around
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      
      setRotation(prev => prev + delta);
      onRotate(delta);
      lastAngle.current = currentAngle;
    };

    const handleEnd = () => {
      if (isInteracting.current) {
        isInteracting.current = false;
        onInteractionEnd();
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleEnd);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [onRotate, onInteractionEnd]);

  return (
    <div className="relative group">
      {/* Outer Ring */}
      <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-[#111] border-4 sm:border-8 border-[#222] shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center justify-center relative overflow-hidden">
        {/* Jog Texture */}
        <div 
          ref={wheelRef}
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          className="w-full h-full rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{ 
            transform: `rotate(${rotation}deg)`,
            background: 'conic-gradient(from 0deg, #111, #222, #111, #222, #111)',
          }}
        >
          {/* Concentric Circles */}
          <div className="absolute inset-2 rounded-full border border-white/5" />
          <div className="absolute inset-8 rounded-full border border-white/5" />
          <div className="absolute inset-16 rounded-full border border-white/5" />
          
          {/* Grip Dots */}
          {[...Array(12)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white/10"
              style={{ 
                transform: `rotate(${i * 30}deg) translateY(-70px) sm:translateY(-100px)` 
              }}
            />
          ))}

          {/* Center Cap */}
          <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-[#1a1a1a] border-2 sm:border-4 border-[#333] shadow-inner flex items-center justify-center">
             <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-orange-500/20 border border-orange-500/40" />
          </div>
        </div>

        {/* Mode Indicator Lights */}
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full transition-all duration-300 ${mode !== 'OFF' ? 'bg-orange-500 shadow-[0_0_10px_orange]' : 'bg-orange-900/20'}`} />
        </div>
      </div>
      
      {/* Label */}
      <div className="absolute -bottom-6 sm:bottom-8 left-1/2 -translate-x-1/2 text-[8px] sm:text-[10px] text-white/40 uppercase font-mono tracking-widest whitespace-nowrap">
        Digital Jog Break
      </div>
    </div>
  );
};
