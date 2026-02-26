/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Sliders, Music, Radio, Settings as SettingsIcon, Cpu } from 'lucide-react';
import { DeckState } from '../types';

interface SettingsViewProps {
  settings: DeckState['settings'];
  onUpdateSettings: (settings: DeckState['settings']) => void;
  onClose: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onClose
}) => {
  const handleChange = (key: keyof DeckState['settings'], value: number) => {
    onUpdateSettings({ ...settings, [key]: value });
  };

  return (
    <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-6">
      <div className="w-full max-w-md bg-[#1a1a1a] rounded-xl border border-white/10 shadow-2xl flex flex-col max-h-full">
        <div className="p-3 sm:p-4 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <SettingsIcon className="text-orange-500 w-4 h-4 sm:w-5 sm:h-5" />
            <h2 className="text-white text-sm sm:text-base font-black uppercase italic tracking-tighter">System Settings</h2>
          </div>
          <button onClick={onClose} className="p-1 sm:p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="text-white/40 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 custom-scrollbar">
          {/* Jog Sensitivity */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500/60">
              <Cpu className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Jog & Control</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] text-white/40 font-mono">
                <span>Jog Sensitivity</span>
                <span>{settings.jogSensitivity.toFixed(1)}x</span>
              </div>
              <input 
                type="range" min="0.1" max="5" step="0.1"
                value={settings.jogSensitivity}
                onChange={(e) => handleChange('jogSensitivity', parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
              />
            </div>
          </section>

          {/* Brake & Start */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500/60">
              <Music className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Brake & Start Time</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Brake</span>
                  <span>{settings.brakeTime}s</span>
                </div>
                <input 
                  type="range" min="0" max="5" step="0.1"
                  value={settings.brakeTime}
                  onChange={(e) => handleChange('brakeTime', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Start</span>
                  <span>{settings.startTime}s</span>
                </div>
                <input 
                  type="range" min="0" max="5" step="0.1"
                  value={settings.startTime}
                  onChange={(e) => handleChange('startTime', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </section>

          {/* DSP Parameters */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500/60">
              <Sliders className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">DSP FX Parameters</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Jet Feedback</span>
                  <span>{(settings.jetFeedback * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="0.99" step="0.01"
                  value={settings.jetFeedback}
                  onChange={(e) => handleChange('jetFeedback', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Wah Resonance (Q)</span>
                  <span>{settings.wahQ.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1" max="20" step="0.5"
                  value={settings.wahQ}
                  onChange={(e) => handleChange('wahQ', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Zip Range (Octaves)</span>
                  <span>{Math.log2(settings.zipRange).toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="1.1" max="8" step="0.1"
                  value={settings.zipRange}
                  onChange={(e) => handleChange('zipRange', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </section>

          {/* Visualizer Settings */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500/60">
              <Cpu className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">Visualizer</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Visualizer Color</span>
                  <div className="flex gap-2">
                    {['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'].map(c => (
                      <button 
                        key={c}
                        onClick={() => onUpdateSettings({ ...settings, vizColor: c })}
                        className={`w-4 h-4 rounded-full border ${settings.vizColor === c ? 'border-white' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-white/40 font-mono">
                  <span>Visualizer Opacity</span>
                  <span>{(settings.vizOpacity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={settings.vizOpacity}
                  onChange={(e) => handleChange('vizOpacity', parseFloat(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            </div>
          </section>

          {/* MIDI & Audio Routing Placeholders */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-orange-500/60">
              <Radio className="w-4 h-4" />
              <h3 className="text-[10px] font-bold uppercase tracking-widest">MIDI & Routing</h3>
            </div>
            <div className="p-4 bg-white/5 rounded-lg border border-white/5 space-y-2">
              <p className="text-[10px] text-white/40 font-mono">MIDI Device: Default System MIDI</p>
              <p className="text-[10px] text-white/40 font-mono">Audio Output: System Default (Stereo)</p>
              <button className="w-full py-2 bg-white/5 hover:bg-white/10 text-[10px] text-white/60 font-bold uppercase rounded transition-colors">
                Scan for Devices
              </button>
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-white/10">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic tracking-tighter rounded-lg transition-colors shadow-lg shadow-orange-900/20"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
