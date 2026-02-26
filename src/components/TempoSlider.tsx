/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';

interface TempoSliderProps {
  value: number; // -1 to 1
  onChange: (value: number) => void;
  range: number;
}

export const TempoSlider: React.FC<TempoSliderProps> = ({ value, onChange, range }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Invert the input: if top is max(1), we want it to be min(-1)
    onChange(-parseFloat(e.target.value));
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-4 h-64 sm:h-80 py-2 sm:py-4 px-1 sm:px-2 bg-[#1a1a1a] border-2 border-[#333] rounded-md shadow-inner">
      <div className="text-[8px] sm:text-[10px] text-white/40 font-mono uppercase vertical-text h-8 sm:h-12">
        Tempo
      </div>
      
      <div className="relative h-full flex items-center justify-center group">
        {/* Track */}
        <div className="absolute w-0.5 sm:w-1 h-full bg-black rounded-full" />
        
        {/* Scale Marks */}
        <div className="absolute inset-y-0 -left-3 sm:-left-4 flex flex-col justify-between py-1 pointer-events-none">
          {[...Array(11)].map((_, i) => (
            <div key={i} className="w-1 sm:w-2 h-[1px] bg-white/20" />
          ))}
        </div>
        
        {/* Slider Input */}
        <input
          type="range"
          min="-1"
          max="1"
          step="0.001"
          value={-value} // Pass inverted value to match browser's vertical max-at-top
          onChange={handleChange}
          className="appearance-none bg-transparent w-1 h-full cursor-pointer z-10 slider-vertical"
          style={{ 
            writingMode: 'vertical-lr',
            direction: 'rtl',
            WebkitAppearance: 'slider-vertical' as any
          }}
        />

        {/* Custom Knob */}
        <div 
          className="absolute w-6 h-10 sm:w-8 sm:h-12 bg-[#222] border-2 border-[#444] rounded-sm shadow-lg pointer-events-none flex items-center justify-center"
          style={{ 
            // value = 1 (fast) -> top = 100% (bottom)
            // value = -1 (slow) -> top = 0% (top)
            top: `${((value + 1) / 2) * 100}%`,
            transform: 'translateY(-50%)'
          }}
        >
          <div className="w-full h-[2px] bg-orange-500 shadow-[0_0_4px_orange]" />
        </div>
      </div>

      <div className="flex flex-col items-center">
        <span className="text-orange-500 font-mono text-[10px] sm:text-xs">±{range}%</span>
        <button 
          onClick={() => onChange(0)}
          className="mt-1 sm:mt-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#333] border border-[#444] active:bg-orange-500 transition-colors flex items-center justify-center"
        >
          <div className="w-1 h-1 rounded-full bg-white/20" />
        </button>
      </div>
    </div>
  );
};
