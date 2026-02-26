/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Disc, Music, Settings, Radio, List, Search, FastForward, Rewind } from 'lucide-react';
import { CDJAudioEngine } from '../services/AudioEngine';
import { MidiService } from '../services/MidiService';
import { CDJDisplay } from './CDJDisplay';
import { JogWheel } from './JogWheel';
import { TempoSlider } from './TempoSlider';
import { PlaylistView } from './PlaylistView';
import { SettingsView } from './SettingsView';
import { DeckState, JogMode, Track } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const CDJDeck: React.FC = () => {
  const [deck, setDeck] = useState<DeckState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    bpm: 128,
    pitch: 0,
    pitchRange: 10,
    cuePoint: null,
    jogMode: 'OFF',
    trackName: '',
    isLooping: false,
    loopStart: null,
    loopEnd: null,
    eq: { low: 0, mid: 0, high: 0 },
    currentTrackIndex: -1,
    effectValue: 0.5,
    isHoldActive: false,
    isMasterTempo: false,
    settings: {
      jogSensitivity: 1.0,
      brakeTime: 0.8,
      startTime: 0.5,
      jetFeedback: 0.92,
      wahQ: 5,
      zipRange: 4,
      vizColor: '#f97316',
      vizOpacity: 0.4,
    }
  });

  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const seekInterval = useRef<number | null>(null);

  const audioEngine = useRef<CDJAudioEngine | null>(null);
  const midiService = useRef<MidiService | null>(null);
  
  const handlersRef = useRef({
    togglePlay: () => {},
    handlePitchChange: (v: number) => {}
  });

  useEffect(() => {
    const engine = new CDJAudioEngine((time) => {
      setDeck(prev => ({ ...prev, currentTime: time }));
    });
    audioEngine.current = engine;
    setAnalyser(engine.getAnalyser());

    midiService.current = new MidiService();
    midiService.current.init().then(() => {
      midiService.current?.onMessage((type, data) => {
        if (type === 'CC' && data.controller === 1) {
          const pitchVal = (data.value / 63.5) - 1;
          handlersRef.current.handlePitchChange(pitchVal);
        }
        if (type === 'NOTE_ON' && data.note === 60) {
          handlersRef.current.togglePlay();
        }
      });
    });

    const handleSeekEvent = (e: any) => {
      if (audioEngine.current) {
        audioEngine.current.seek(e.detail);
      }
    };
    window.addEventListener('cdj-seek', handleSeekEvent);

    return () => {
      window.removeEventListener('cdj-seek', handleSeekEvent);
    };
  }, []);

  const loadTrack = async (index: number) => {
    if (!audioEngine.current || index < 0 || index >= playlist.length) return;
    
    const track = playlist[index];
    const buffer = await audioEngine.current.loadTrack(track.file);
    
    setDeck(prev => ({
      ...prev,
      trackName: track.name,
      duration: buffer.duration,
      currentTime: 0,
      isPlaying: false,
      isPaused: false,
      cuePoint: 0,
      currentTrackIndex: index,
      bpm: track.bpm || 128
    }));
  };

  const handleAddTracks = async (files: FileList) => {
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newTracks.push({
        id: Math.random().toString(36).substr(2, 9),
        file,
        name: file.name,
        duration: 0,
        bpm: 128
      });
    }
    setPlaylist(prev => [...prev, ...newTracks]);
    if (deck.currentTrackIndex === -1 && newTracks.length > 0) {
      setTimeout(() => loadTrack(playlist.length), 100);
    }
  };

  const handleRemoveTrack = (index: number) => {
    setPlaylist(prev => prev.filter((_, i) => i !== index));
    if (index === deck.currentTrackIndex) {
      audioEngine.current?.stop();
      setDeck(prev => ({ ...prev, currentTrackIndex: -1, trackName: '', duration: 0, currentTime: 0 }));
    } else if (index < deck.currentTrackIndex) {
      setDeck(prev => ({ ...prev, currentTrackIndex: prev.currentTrackIndex - 1 }));
    }
  };

  const togglePlay = useCallback((withBrake: boolean = false) => {
    if (!audioEngine.current || deck.currentTrackIndex === -1) return;
    setDeck(prev => {
      if (prev.isPlaying) {
        audioEngine.current?.pause(withBrake ? prev.settings.brakeTime : 0);
        return { ...prev, isPlaying: false, isPaused: true };
      } else {
        audioEngine.current?.play(prev.currentTime, withBrake ? prev.settings.startTime : 0);
        return { ...prev, isPlaying: true, isPaused: false };
      }
    });
  }, [deck.currentTrackIndex]);

  const handlePitchChange = useCallback((value: number) => {
    setDeck(prev => {
      const rate = 1.0 + (value * (prev.pitchRange / 100));
      audioEngine.current?.setPlaybackRate(rate);
      return { ...prev, pitch: value };
    });
  }, []);

  const handleEQChange = (band: 'low' | 'mid' | 'high', value: number) => {
    setDeck(prev => ({
      ...prev,
      eq: { ...prev.eq, [band]: value }
    }));
    if (band === 'low') audioEngine.current?.setLow(value);
    if (band === 'mid') audioEngine.current?.setMid(value);
    if (band === 'high') audioEngine.current?.setHigh(value);
  };

  const handleNextTrack = () => {
    if (deck.currentTrackIndex < playlist.length - 1) {
      loadTrack(deck.currentTrackIndex + 1);
    }
  };

  const handlePrevTrack = () => {
    if (deck.currentTrackIndex > 0) {
      loadTrack(deck.currentTrackIndex - 1);
    }
  };

  const handleSeek = (amount: number) => {
    if (!audioEngine.current) return;
    audioEngine.current.seek(deck.currentTime + amount);
  };

  const startSeeking = (amount: number) => {
    handleSeek(amount);
    seekInterval.current = window.setInterval(() => handleSeek(amount), 100);
  };

  const stopSeeking = () => {
    if (seekInterval.current) {
      clearInterval(seekInterval.current);
      seekInterval.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (seekInterval.current) clearInterval(seekInterval.current);
    };
  }, []);

  useEffect(() => {
    handlersRef.current = { togglePlay, handlePitchChange };
  }, [togglePlay, handlePitchChange]);

  const handleCue = () => {
    if (!audioEngine.current || deck.currentTrackIndex === -1) return;
    if (deck.isPlaying) {
      audioEngine.current.stop();
      audioEngine.current.seek(deck.cuePoint || 0);
      setDeck(prev => ({ ...prev, isPlaying: false, isPaused: false, currentTime: deck.cuePoint || 0 }));
    } else {
      if (deck.isPaused) {
        setDeck(prev => ({ ...prev, cuePoint: deck.currentTime }));
      } else {
        audioEngine.current.play(deck.cuePoint || 0);
        setDeck(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handleJogRotate = (delta: number) => {
    if (!audioEngine.current) return;
    
    if (deck.jogMode === 'OFF') {
      if (deck.isPlaying) {
        const nudge = delta / 50;
        audioEngine.current.seek(deck.currentTime + nudge);
      }
      return;
    }

    if (deck.jogMode === 'BEND') {
      const bend = delta / 100;
      const currentRate = 1.0 + (deck.pitch * (deck.pitchRange / 100));
      audioEngine.current.setPlaybackRate(currentRate + bend);
      return;
    }

    // Effect modes: JET, ZIP, WAH, CRUSH, BUBBLE, TRANS
    setDeck(prev => {
      const sensitivity = prev.settings.jogSensitivity;
      const newValue = Math.max(0, Math.min(1, prev.effectValue + ((delta * sensitivity) / 200)));
      
      switch (prev.jogMode) {
        case 'JET':
          audioEngine.current?.setJet(newValue, prev.settings.jetFeedback);
          break;
        case 'WAH':
          audioEngine.current?.setWah(newValue, prev.settings.wahQ);
          break;
        case 'ZIP':
          audioEngine.current?.setZip(newValue, prev.settings.zipRange);
          break;
        case 'CRUSH':
          audioEngine.current?.setCrush(newValue);
          break;
        case 'BUBBLE':
          audioEngine.current?.setBubble(newValue);
          break;
        case 'TRANS':
          audioEngine.current?.setTrans(newValue);
          break;
      }
      
      return { ...prev, effectValue: newValue };
    });
  };

  const handleLoopIn = () => {
    setDeck(prev => ({ ...prev, loopStart: prev.currentTime }));
  };

  const handleLoopOut = () => {
    setDeck(prev => {
      const isLooping = prev.loopStart !== null;
      if (isLooping) {
        audioEngine.current?.setLoop(prev.loopStart, prev.currentTime, true);
      }
      return { ...prev, loopEnd: prev.currentTime, isLooping };
    });
  };

  const handleExitLoop = () => {
    setDeck(prev => {
      audioEngine.current?.setLoop(null, null, false);
      return { ...prev, isLooping: false, loopStart: null, loopEnd: null };
    });
  };

  const handleJogEnd = () => {
    if (!deck.isHoldActive && deck.jogMode !== 'OFF' && deck.jogMode !== 'BEND') {
      setDeck(prev => {
        audioEngine.current?.resetEffects();
        return { ...prev, effectValue: 0.5 };
      });
    } else if (deck.jogMode === 'BEND') {
      audioEngine.current?.resetEffects();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#050505] p-2 sm:p-4 font-sans overflow-x-hidden">
      {/* CDJ Body */}
      <div className="w-full max-w-[520px] bg-[#c0c0c0] rounded-xl p-4 sm:p-8 shadow-[0_30px_60px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.5)] border-b-8 border-[#888] relative overflow-hidden">
        {/* Metallic Grain Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/brushed-alum.png')]" />
        
        {showPlaylist && (
          <PlaylistView 
            tracks={playlist}
            currentTrackIndex={deck.currentTrackIndex}
            onSelectTrack={loadTrack}
            onRemoveTrack={handleRemoveTrack}
            onAddTracks={handleAddTracks}
            onClose={() => setShowPlaylist(false)}
          />
        )}

        {showSettings && (
          <SettingsView 
            settings={deck.settings}
            onUpdateSettings={(s) => setDeck(prev => ({ ...prev, settings: s }))}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Top Section */}
        <div className="flex flex-col gap-6 relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 sm:gap-2 mb-1">
                <Disc className="text-black/40 w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-black/60 font-black tracking-tighter text-lg sm:text-2xl italic uppercase">
                  CDJ-100-<span className="text-orange-600">BASSEL</span>
                </span>
              </div>
              <span className="text-[8px] text-black/40 font-bold uppercase tracking-[0.3em] ml-7">
                Digital Performance Player
              </span>
            </div>
            
            <div className="flex flex-col items-end gap-2 sm:gap-4">
              <div className="flex gap-1 sm:gap-2">
                <button 
                  onClick={() => setShowPlaylist(true)}
                  className="p-2 sm:p-3 rounded-md bg-[#222] border-b-4 border-black hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all"
                >
                  <List className="text-orange-500 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-2 sm:p-3 rounded-md bg-[#222] border-b-4 border-black hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all"
                >
                  <Settings className="text-white/40 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              
              {/* Eject Button */}
              <button className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-[#222] border-b-4 border-black flex items-center justify-center hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all">
                <div className="w-3 sm:w-4 h-[2px] bg-white/40 relative">
                  <div className="absolute -top-1.5 sm:-top-2 left-0 w-0 h-0 border-l-[6px] sm:border-l-[8px] border-l-transparent border-r-[6px] sm:border-r-[8px] border-r-transparent border-b-[6px] sm:border-b-[8px] border-b-white/40" />
                </div>
              </button>
            </div>
          </div>

          <CDJDisplay 
            currentTime={deck.currentTime}
            duration={deck.duration}
            pitch={deck.pitch}
            trackName={deck.trackName}
            bpm={deck.bpm * (1 + (deck.pitch * (deck.pitchRange / 100)))}
            trackIndex={deck.currentTrackIndex}
            totalTracks={playlist.length}
            analyser={analyser}
            vizColor={deck.settings.vizColor}
            vizOpacity={deck.settings.vizOpacity}
          />

          {/* Digital Jog Break Selectors */}
          <div className="flex flex-col gap-4 py-2 sm:py-4 bg-black/5 rounded-lg border border-black/5">
            <div className="flex justify-center items-center gap-4 sm:gap-6">
              <div className="text-[7px] sm:text-[8px] text-black/40 font-bold uppercase vertical-text min-w-fit">Jog Break</div>
              {(['JET', 'ZIP', 'WAH', 'CRUSH', 'BUBBLE', 'TRANS'] as JogMode[]).map(m => (
                <div key={m} className="flex flex-col items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => setDeck(prev => ({ ...prev, jogMode: prev.jogMode === m ? 'OFF' : m }))}
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-200 border-2 sm:border-4 ${
                      deck.jogMode === m 
                        ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.6)]' 
                        : 'bg-[#333] border-black hover:bg-[#444]'
                    }`}
                  />
                  <span className={`text-[7px] sm:text-[8px] font-black uppercase ${deck.jogMode === m ? 'text-blue-600' : 'text-black/40'}`}>
                    {m}
                  </span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-1 sm:gap-2 min-w-fit">
                <button 
                  onClick={() => setDeck(prev => ({ ...prev, isHoldActive: !prev.isHoldActive }))}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 transition-all ${
                    deck.isHoldActive ? 'bg-orange-500 border-orange-400 shadow-[0_0_8px_orange]' : 'bg-[#222] border-black'
                  }`} 
                />
                <span className={`text-[7px] sm:text-[8px] font-bold uppercase ${deck.isHoldActive ? 'text-orange-500' : 'text-black/40'}`}>Hold</span>
              </div>
            </div>

            {/* Looping Controls */}
            <div className="flex justify-center items-center gap-4 sm:gap-8 border-t border-black/5 pt-2">
              <div className="text-[7px] sm:text-[8px] text-black/40 font-bold uppercase vertical-text min-w-fit">Loop</div>
              <div className="flex gap-3">
                <button 
                  onClick={handleLoopIn}
                  className={`px-3 py-1 rounded bg-[#222] border-b-2 border-black text-[8px] font-bold uppercase transition-all ${deck.loopStart !== null ? 'text-orange-500 border-orange-900' : 'text-white/60'}`}
                >
                  In
                </button>
                <button 
                  onClick={handleLoopOut}
                  className={`px-3 py-1 rounded bg-[#222] border-b-2 border-black text-[8px] font-bold uppercase transition-all ${deck.loopEnd !== null ? 'text-orange-500 border-orange-900' : 'text-white/60'}`}
                >
                  Out
                </button>
                <button 
                  onClick={handleExitLoop}
                  className={`px-3 py-1 rounded bg-[#222] border-b-2 border-black text-[8px] font-bold uppercase text-white/60 transition-all active:translate-y-0.5`}
                >
                  Exit
                </button>
              </div>
              {deck.isLooping && (
                <div className="text-[8px] text-orange-500 font-black animate-pulse uppercase">Loop Active</div>
              )}
            </div>
          </div>
        </div>

        {/* Middle Section: Jog & Pitch & EQ */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-10 gap-6 sm:gap-0 relative z-10">
          {/* Left Side: Track Search & Search & EQ */}
          <div className="flex flex-row sm:flex-col gap-4 sm:gap-6 w-full sm:w-auto overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
            <div className="flex flex-col gap-2 min-w-fit">
              <span className="text-[8px] text-black/40 font-bold uppercase text-center">Track Search</span>
              <div className="flex gap-2">
                <button 
                  onClick={handlePrevTrack}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-[#222] border-b-4 border-black flex items-center justify-center hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all"
                >
                  <SkipBack className="text-white/60 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  onClick={handleNextTrack}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-[#222] border-b-4 border-black flex items-center justify-center hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all"
                >
                  <SkipForward className="text-white/60 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-2 min-w-fit">
              <span className="text-[8px] text-black/40 font-bold uppercase text-center">Search</span>
              <div className="flex gap-2">
                <button 
                  onMouseDown={() => startSeeking(-2)}
                  onMouseUp={stopSeeking}
                  onMouseLeave={stopSeeking}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-[#222] border-b-4 border-black flex items-center justify-center hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all"
                >
                  <Rewind className="text-white/60 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button 
                  onMouseDown={() => startSeeking(2)}
                  onMouseUp={stopSeeking}
                  onMouseLeave={stopSeeking}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-md bg-[#222] border-b-4 border-black flex items-center justify-center hover:bg-[#333] active:border-b-0 active:translate-y-1 transition-all"
                >
                  <FastForward className="text-white/60 w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            {/* EQ Section */}
            <div className="flex flex-col gap-3 p-2 sm:p-4 bg-black/5 rounded-lg border border-black/5 min-w-[120px] sm:min-w-0">
              <span className="text-[8px] text-black/40 font-bold uppercase text-center">Equalizer</span>
              {(['high', 'mid', 'low'] as const).map(band => (
                <div key={band} className="flex flex-col gap-1">
                  <div className="flex justify-between text-[7px] sm:text-[8px] text-black/40 font-bold uppercase">
                    <span>{band}</span>
                    <span>{deck.eq[band] > 0 ? '+' : ''}{deck.eq[band]}dB</span>
                  </div>
                  <input 
                    type="range" 
                    min="-24" 
                    max="6" 
                    value={deck.eq[band]} 
                    onChange={(e) => handleEQChange(band, parseInt(e.target.value))}
                    className="w-full h-1 bg-black/20 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-row sm:flex-row items-center gap-4 sm:gap-6">
            <JogWheel 
              mode={deck.jogMode}
              onRotate={handleJogRotate}
              onInteractionStart={() => {}}
              onInteractionEnd={handleJogEnd}
            />
            
            <TempoSlider 
              value={deck.pitch}
              onChange={handlePitchChange}
              range={deck.pitchRange}
            />
          </div>
        </div>

        {/* Bottom Section: Transport */}
        <div className="flex justify-between items-end mt-8 sm:mt-12 relative z-10">
          <div className="flex gap-4 sm:gap-8">
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={handleCue}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-[#222] border-b-8 border-black flex flex-col items-center justify-center group active:border-b-0 active:translate-y-2 transition-all"
              >
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 sm:mb-2 ${deck.cuePoint !== null ? 'bg-orange-500 shadow-[0_0_8px_orange]' : 'bg-[#444]'}`} />
                <span className="text-[10px] sm:text-xs text-white font-black uppercase italic tracking-tighter">Cue</span>
              </button>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => togglePlay(true)}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-b-8 flex flex-col items-center justify-center active:border-b-0 active:translate-y-2 transition-all ${
                  deck.isPlaying 
                    ? 'bg-blue-600 border-blue-900 shadow-[0_0_30px_rgba(37,99,235,0.4)]' 
                    : 'bg-[#222] border-black'
                }`}
              >
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 sm:mb-2 ${deck.isPlaying ? 'bg-blue-400 shadow-[0_0_8px_#60a5fa]' : 'bg-[#444]'}`} />
                {deck.isPlaying ? (
                  <Pause className="text-white w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                ) : (
                  <Play className="text-white w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                )}
                <span className="text-[8px] sm:text-[10px] text-white font-black uppercase italic tracking-tighter mt-1 leading-tight text-center">
                  Brake<br/>Start/Stop
                </span>
              </button>
            </div>

            <div className="flex flex-col items-center gap-2">
              <button 
                onClick={() => togglePlay(false)}
                className={`w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-b-8 flex flex-col items-center justify-center active:border-b-0 active:translate-y-2 transition-all ${
                  deck.isPlaying 
                    ? 'bg-orange-600 border-orange-900 shadow-[0_0_30px_rgba(234,88,12,0.4)]' 
                    : 'bg-[#222] border-black'
                }`}
              >
                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full mb-1 sm:mb-2 ${deck.isPlaying ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-[#444]'}`} />
                {deck.isPlaying ? (
                  <Pause className="text-white w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                ) : (
                  <Play className="text-white w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                )}
                <span className="text-[8px] sm:text-[10px] text-white font-black uppercase italic tracking-tighter mt-1 leading-tight text-center">
                  Play/Pause
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 sm:gap-4">
             <div className="flex flex-col items-center gap-1">
                <button 
                  onClick={() => setDeck(prev => ({ ...prev, isMasterTempo: !prev.isMasterTempo }))}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-b-4 border-black transition-all ${
                    deck.isMasterTempo ? 'bg-orange-500 shadow-[0_0_10px_orange]' : 'bg-[#222]'
                  }`}
                />
                <span className={`text-[7px] sm:text-[8px] font-bold uppercase ${deck.isMasterTempo ? 'text-orange-500' : 'text-black/60'}`}>Master Tempo</span>
             </div>
             
             <div className="p-2 sm:p-4 bg-black/10 rounded-lg border border-black/5">
                <div className="text-[8px] sm:text-[10px] text-black/40 font-bold uppercase tracking-widest text-right">
                  Pioneer DJ
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center">
        <p className="text-black/20 text-[10px] font-black uppercase tracking-[0.5em]">
          CDJ-100-BASSEL / Nostalgia Series
        </p>
      </div>
    </div>
  );
};
