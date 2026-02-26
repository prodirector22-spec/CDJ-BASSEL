/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { JogMode } from '../types';

export class CDJAudioEngine {
  private context: AudioContext;
  private source: AudioBufferSourceNode | null = null;
  private buffer: AudioBuffer | null = null;
  private gainNode: GainNode;
  
  // Effects
  private filterNode: BiquadFilterNode;
  private flangerDelay: DelayNode;
  private flangerFeedback: GainNode;
  private flangerGain: GainNode;
  
  // ZIP (Pitch Shifter) nodes - using a more robust Doppler approach
  private zipDelay: DelayNode;
  private zipLFO: OscillatorNode;
  private zipLFOGain: GainNode;
  private zipGain: GainNode;

  // New Effects
  private crushNode: WaveShaperNode;
  private bubbleDelay: DelayNode;
  private bubbleFeedback: GainNode;
  private bubbleGain: GainNode;
  private transGain: GainNode;
  private transLFO: OscillatorNode;
  
  // EQ Nodes
  private eqLow: BiquadFilterNode;
  private eqMid: BiquadFilterNode;
  private eqHigh: BiquadFilterNode;
  private analyser: AnalyserNode;
  
  private startTime: number = 0;
  private pauseOffset: number = 0;
  private playbackRate: number = 1.0;
  private targetPlaybackRate: number = 1.0;
  
  private onTimeUpdate: (time: number) => void;

  constructor(onTimeUpdate: (time: number) => void) {
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)({
      latencyHint: 'interactive',
      sampleRate: 44100,
    });
    this.gainNode = this.context.createGain();
    
    // Filter for WAH
    this.filterNode = this.context.createBiquadFilter();
    this.filterNode.type = 'bandpass';
    this.filterNode.frequency.value = 1000;
    this.filterNode.Q.value = 5;

    // Flanger for JET
    this.flangerDelay = this.context.createDelay(0.1);
    this.flangerFeedback = this.context.createGain();
    this.flangerGain = this.context.createGain();
    this.flangerDelay.delayTime.value = 0.001;
    this.flangerFeedback.gain.value = 0.92;
    this.flangerGain.gain.value = 0;

    // Pitch Shifter for ZIP
    this.zipDelay = this.context.createDelay(0.1);
    this.zipLFO = this.context.createOscillator();
    this.zipLFOGain = this.context.createGain();
    this.zipGain = this.context.createGain();
    
    this.zipLFO.type = 'sawtooth';
    this.zipLFO.frequency.value = 60;
    this.zipLFOGain.gain.value = 0;
    this.zipGain.gain.value = 0;
    
    this.zipLFO.connect(this.zipLFOGain);
    this.zipLFOGain.connect(this.zipDelay.delayTime);
    this.zipLFO.start();

    // Crush (Distortion)
    this.crushNode = this.context.createWaveShaper();
    this.crushNode.curve = this.makeDistortionCurve(400);
    this.crushNode.oversample = '4x';

    // Bubble (Echo)
    this.bubbleDelay = this.context.createDelay(1.0);
    this.bubbleFeedback = this.context.createGain();
    this.bubbleGain = this.context.createGain();
    this.bubbleDelay.delayTime.value = 0.3;
    this.bubbleFeedback.gain.value = 0.5;
    this.bubbleGain.gain.value = 0;
    this.bubbleDelay.connect(this.bubbleFeedback);
    this.bubbleFeedback.connect(this.bubbleDelay);
    this.bubbleDelay.connect(this.bubbleGain);

    // Trans (Gater)
    this.transGain = this.context.createGain();
    this.transGain.gain.value = 1.0;
    this.transLFO = this.context.createOscillator();
    this.transLFO.type = 'square';
    this.transLFO.frequency.value = 8;
    const transLFOGain = this.context.createGain();
    transLFOGain.gain.value = 0; // Start inactive
    this.transLFO.connect(transLFOGain);
    transLFOGain.connect(this.transGain.gain);
    this.transLFO.start();

    // EQ Setup
    this.eqLow = this.context.createBiquadFilter();
    this.eqLow.type = 'lowshelf';
    this.eqLow.frequency.value = 320;

    this.eqMid = this.context.createBiquadFilter();
    this.eqMid.type = 'peaking';
    this.eqMid.frequency.value = 1000;
    this.eqMid.Q.value = 1.0;

    this.eqHigh = this.context.createBiquadFilter();
    this.eqHigh.type = 'highshelf';
    this.eqHigh.frequency.value = 3200;

    // Routing
    this.eqLow.connect(this.eqMid);
    this.eqMid.connect(this.eqHigh);
    this.eqHigh.connect(this.gainNode);
    
    // Connect new effects
    this.bubbleGain.connect(this.gainNode);
    this.gainNode.connect(this.transGain);

    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.transGain.connect(this.analyser);
    this.analyser.connect(this.context.destination);
    
    this.onTimeUpdate = onTimeUpdate;
    this.tick();
  }

  private tick = () => {
    if (this.source && this.context.state === 'running') {
      const current = this.getCurrentTime();
      this.onTimeUpdate(current);

      // Looping logic
      if (this.isLooping && this.loopEnd !== null && this.loopStart !== null) {
        if (current >= this.loopEnd) {
          this.seek(this.loopStart);
        }
      }
    }
    requestAnimationFrame(this.tick);
  };

  private isLooping: boolean = false;
  private loopStart: number | null = null;
  private loopEnd: number | null = null;

  setLoop(start: number | null, end: number | null, active: boolean) {
    this.loopStart = start;
    this.loopEnd = end;
    this.isLooping = active;
  }

  private makeDistortionCurve(amount: number) {
    const k = amount;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  async loadTrack(file: File): Promise<AudioBuffer> {
    const arrayBuffer = await file.arrayBuffer();
    this.buffer = await this.context.decodeAudioData(arrayBuffer);
    return this.buffer;
  }

  play(offset: number = 0, brakeTime: number = 0) {
    if (!this.buffer) return;
    this.stop();
    
    this.source = this.context.createBufferSource();
    this.source.buffer = this.buffer;
    
    // Initial rate for brake start
    const initialRate = brakeTime > 0 ? 0.01 : this.playbackRate;
    this.source.playbackRate.value = initialRate;
    
    // Routing
    this.source.connect(this.eqLow);
    this.source.connect(this.filterNode);
    this.filterNode.connect(this.gainNode);
    this.source.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerFeedback);
    this.flangerFeedback.connect(this.flangerDelay);
    this.flangerDelay.connect(this.flangerGain);
    this.flangerGain.connect(this.gainNode);
    this.source.connect(this.zipDelay);
    this.zipDelay.connect(this.zipGain);
    this.zipGain.connect(this.gainNode);

    this.source.connect(this.crushNode);
    this.crushNode.connect(this.gainNode);

    this.source.connect(this.bubbleDelay);

    this.startTime = this.context.currentTime - (offset / this.playbackRate);
    this.source.start(0, offset);
    this.pauseOffset = offset;

    if (brakeTime > 0) {
      this.source.playbackRate.exponentialRampToValueAtTime(this.playbackRate, this.context.currentTime + brakeTime);
    }
  }

  pause(brakeTime: number = 0) {
    if (this.source) {
      if (brakeTime > 0) {
        this.source.playbackRate.exponentialRampToValueAtTime(0.01, this.context.currentTime + brakeTime);
        setTimeout(() => {
          if (this.source) {
            this.pauseOffset = this.getCurrentTime();
            this.source.stop();
            this.source = null;
          }
        }, brakeTime * 1000);
      } else {
        this.pauseOffset = this.getCurrentTime();
        this.source.stop();
        this.source = null;
      }
    }
  }

  stop() {
    if (this.source) {
      try {
        this.source.stop();
      } catch (e) {}
      this.source = null;
    }
    this.pauseOffset = 0;
  }

  getCurrentTime(): number {
    if (!this.source) return this.pauseOffset;
    // Note: this is an approximation when playbackRate is ramping
    return (this.context.currentTime - this.startTime) * this.playbackRate;
  }

  setPlaybackRate(rate: number) {
    this.playbackRate = rate;
    if (this.source) {
      this.source.playbackRate.setTargetAtTime(rate, this.context.currentTime, 0.05);
      const currentPos = this.getCurrentTime();
      this.startTime = this.context.currentTime - (currentPos / rate);
    }
  }

  // EQ Controls
  setLow(gain: number) { this.eqLow.gain.setTargetAtTime(gain, this.context.currentTime, 0.1); }
  setMid(gain: number) { this.eqMid.gain.setTargetAtTime(gain, this.context.currentTime, 0.1); }
  setHigh(gain: number) { this.eqHigh.gain.setTargetAtTime(gain, this.context.currentTime, 0.1); }

  // Effect Controls
  setWah(value: number, q: number = 5) {
    const freq = 200 + value * 4000;
    this.filterNode.frequency.setTargetAtTime(freq, this.context.currentTime, 0.05);
    this.filterNode.Q.setTargetAtTime(q, this.context.currentTime, 0.05);
  }

  setJet(value: number, feedback: number = 0.92) {
    // Manual flanger: delay time is controlled by the jog
    // Range: 0.1ms to 15ms is the sweet spot for flanging
    const delay = 0.0001 + value * 0.0149; 
    this.flangerDelay.delayTime.setTargetAtTime(delay, this.context.currentTime, 0.02);
    
    // High feedback creates the "swirling" phased resonance
    this.flangerFeedback.gain.setTargetAtTime(feedback, this.context.currentTime, 0.05);
    
    // Mix control: Only active when jog is moved (value > 0)
    // We use a slightly lower gain to avoid clipping when combined with dry
    this.flangerGain.gain.setTargetAtTime(value > 0 ? 0.8 : 0, this.context.currentTime, 0.05);
  }

  setZip(value: number, range: number = 2) {
    // ZIP on CDJ-100 is a pitch modulation effect
    // We use the playbackRate for the most authentic "turntable" feel
    // value 0.5 is neutral (1.0x), 0 is slow (0.5x), 1 is fast (2.0x)
    const rateFactor = Math.pow(range, (value - 0.5) * 2);
    if (this.source) {
      this.source.playbackRate.setTargetAtTime(rateFactor * this.playbackRate, this.context.currentTime, 0.05);
    }
  }

  setCrush(value: number) {
    // Increase distortion amount based on jog
    const amount = value * 1000;
    this.crushNode.curve = this.makeDistortionCurve(amount);
  }

  setBubble(value: number) {
    // Echo effect: delay time and feedback
    const delayTime = 0.05 + value * 0.9;
    this.bubbleDelay.delayTime.setTargetAtTime(delayTime, this.context.currentTime, 0.05);
    this.bubbleFeedback.gain.setTargetAtTime(0.3 + value * 0.5, this.context.currentTime, 0.05);
    this.bubbleGain.gain.setTargetAtTime(value > 0 ? 0.6 : 0, this.context.currentTime, 0.05);
  }

  setTrans(value: number) {
    // Gater effect: frequency of the square wave
    const freq = 1 + value * 20;
    this.transLFO.frequency.setTargetAtTime(freq, this.context.currentTime, 0.05);
    // We don't have a direct mix, but we can modulate the gain
  }

  resetEffects() {
    this.filterNode.frequency.setTargetAtTime(1000, this.context.currentTime, 0.1);
    this.flangerGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    this.zipGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    this.zipLFOGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    this.bubbleGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    this.crushNode.curve = this.makeDistortionCurve(0);
    if (this.source) {
      this.source.playbackRate.setTargetAtTime(this.playbackRate, this.context.currentTime, 0.1);
    }
  }

  seek(time: number) {
    const wasPlaying = !!this.source;
    this.stop();
    this.pauseOffset = Math.max(0, Math.min(time, this.buffer?.duration || 0));
    if (wasPlaying) {
      this.play(this.pauseOffset);
    }
  }

  getAnalyser(): AnalyserNode {
    return this.analyser;
  }
}
