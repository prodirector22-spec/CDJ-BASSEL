/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type JogMode = 'OFF' | 'JET' | 'ZIP' | 'WAH' | 'BEND' | 'CRUSH' | 'BUBBLE' | 'TRANS';

export interface Track {
  id: string;
  file: File;
  name: string;
  duration: number;
  bpm: number;
}

export interface DeckState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  bpm: number;
  pitch: number; // -1 to 1
  pitchRange: 10 | 16 | 24 | 100;
  cuePoint: number | null;
  jogMode: JogMode;
  trackName: string;
  isLooping: boolean;
  loopStart: number | null;
  loopEnd: number | null;
  eq: {
    low: number; // -24 to +6 dB
    mid: number;
    high: number;
  };
  currentTrackIndex: number;
  effectValue: number;
  isHoldActive: boolean;
  isMasterTempo: boolean;
  settings: {
    jogSensitivity: number;
    brakeTime: number; // seconds
    startTime: number; // seconds
    jetFeedback: number;
    wahQ: number;
    zipRange: number;
    vizColor: string;
    vizOpacity: number;
  };
}
