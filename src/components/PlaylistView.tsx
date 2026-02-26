/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Music, Trash2, Play, Plus } from 'lucide-react';
import { Track } from '../types';

interface PlaylistViewProps {
  tracks: Track[];
  currentTrackIndex: number;
  onSelectTrack: (index: number) => void;
  onRemoveTrack: (index: number) => void;
  onAddTracks: (files: FileList) => void;
  onClose: () => void;
}

export const PlaylistView: React.FC<PlaylistViewProps> = ({
  tracks,
  currentTrackIndex,
  onSelectTrack,
  onRemoveTrack,
  onAddTracks,
  onClose
}) => {
  return (
    <div className="absolute inset-0 bg-[#111] z-50 flex flex-col p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h2 className="text-orange-500 font-bold text-lg sm:text-xl tracking-tighter uppercase flex items-center gap-2">
          <Music className="w-4 h-4 sm:w-5 sm:h-5" />
          Playlist
        </h2>
        <div className="flex gap-2">
          <label className="cursor-pointer bg-orange-500 text-black px-3 sm:px-4 py-1 rounded-sm text-[10px] sm:text-xs font-bold uppercase hover:bg-orange-400 transition-colors flex items-center gap-1 sm:gap-2">
            <Plus className="w-3 h-3" />
            Add
            <input 
              type="file" 
              multiple 
              accept="audio/*" 
              className="hidden" 
              onChange={(e) => e.target.files && onAddTracks(e.target.files)} 
            />
          </label>
          <button 
            onClick={onClose}
            className="bg-[#222] text-white/60 px-4 py-1 rounded-sm text-xs font-bold uppercase hover:bg-[#333] transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {tracks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-white/20">
            <Music className="w-12 h-12 mb-2 opacity-10" />
            <p className="text-sm font-mono uppercase tracking-widest">No tracks loaded</p>
          </div>
        ) : (
          tracks.map((track, index) => (
            <div 
              key={track.id}
              className={`group flex items-center justify-between p-3 rounded-sm border transition-all ${
                index === currentTrackIndex 
                  ? 'bg-orange-500/10 border-orange-500/30' 
                  : 'bg-[#1a1a1a] border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <span className={`font-mono text-xs ${index === currentTrackIndex ? 'text-orange-500' : 'text-white/20'}`}>
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className={`text-sm truncate font-medium ${index === currentTrackIndex ? 'text-orange-500' : 'text-white/80'}`}>
                    {track.name}
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onSelectTrack(index)}
                  className="p-2 rounded-full bg-orange-500 text-black hover:bg-orange-400 transition-colors"
                >
                  <Play className="w-3 h-3 fill-current" />
                </button>
                <button 
                  onClick={() => onRemoveTrack(index)}
                  className="p-2 rounded-full bg-[#333] text-white/60 hover:bg-red-500 hover:text-white transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
