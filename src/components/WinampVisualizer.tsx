/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState } from 'react';

interface WinampVisualizerProps {
  analyser: AnalyserNode | null;
  mode: 'spectrum' | 'oscilloscope' | 'milkdrop';
  color?: string;
}

export const WinampVisualizer: React.FC<WinampVisualizerProps> = ({ 
  analyser, 
  mode, 
  color = '#f97316' // orange-500
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (mode === 'spectrum') {
        analyser.getByteFrequencyData(dataArray);
        const barWidth = (width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height;
          ctx.fillStyle = color;
          ctx.fillRect(x, height - barHeight, barWidth - 1, barHeight);
          x += barWidth;
        }
      } else if (mode === 'oscilloscope') {
        analyser.getByteTimeDomainData(dataArray);
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
      } else if (mode === 'milkdrop') {
        analyser.getByteFrequencyData(dataArray);
        const timeData = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(timeData);

        // Simple generative effect
        const time = Date.now() / 1000;
        ctx.save();
        ctx.translate(width / 2, height / 2);
        
        const segments = 32;
        const radius = Math.min(width, height) / 4;
        
        for (let i = 0; i < segments; i++) {
          const angle = (i / segments) * Math.PI * 2 + time;
          const freqIndex = Math.floor((i / segments) * bufferLength);
          const freq = dataArray[freqIndex] / 255;
          const amp = timeData[freqIndex] / 255;
          
          const r = radius + freq * 30;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          ctx.beginPath();
          ctx.arc(x, y, 2 + amp * 10, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.5 + freq * 0.5;
          ctx.fill();
          
          // Connect to center
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(x, y);
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.1 + freq * 0.2;
          ctx.stroke();
        }
        ctx.restore();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, mode, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={150} 
      className="w-full h-full opacity-60"
    />
  );
};
