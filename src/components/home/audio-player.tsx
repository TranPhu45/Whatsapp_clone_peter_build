"use client";

import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '../ui/button';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
}

const AudioPlayer = ({ audioUrl }: AudioPlayerProps) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#4a9eff',
        progressColor: '#2D7FE0',
        cursorColor: '#999',
        height: 40,
        normalize: true,
        minPxPerSec: 100,
        cursorWidth: 1,
        autoScroll: true,
        hideScrollbar: true,
        backend: 'WebAudio'
      });

      wavesurfer.current.load(audioUrl);

      wavesurfer.current.on('ready', () => {
        setIsReady(true);
        wavesurfer.current?.seekTo(0);
      });

      wavesurfer.current.on('finish', () => {
        setIsPlaying(false);
        wavesurfer.current?.seekTo(0);
      });

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, [audioUrl]);

  const togglePlayPause = () => {
    if (wavesurfer.current && isReady) {
      if (isPlaying) {
        wavesurfer.current.pause();
      } else {
        if (wavesurfer.current.getCurrentTime() >= wavesurfer.current.getDuration()) {
          wavesurfer.current.seekTo(0);
        }
        wavesurfer.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex items-center gap-4 w-full max-w-[300px]">
      <Button 
        onClick={togglePlayPause} 
        variant="ghost" 
        size="icon"
        className="h-8 w-8"
        disabled={!isReady}
      >
        {isPlaying ? <Pause size={20} /> : <Play size={20} />}
      </Button>
      <div ref={waveformRef} className="flex-1" />
    </div>
  );
};

export default AudioPlayer; 