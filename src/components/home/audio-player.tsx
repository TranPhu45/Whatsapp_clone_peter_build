"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui/button';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
}

const AudioPlayer = ({ audioUrl }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const progress = (audio.currentTime / audio.duration) * 100;
      setProgress(isNaN(progress) ? 0 : progress);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      if (audio.readyState >= 2) {
        if (isPlaying) {
          await audio.pause();
        } else {
          await audio.play();
        }
        setIsPlaying(!isPlaying);
      } else {
        audio.addEventListener('canplay', async () => {
          await audio.play();
          setIsPlaying(true);
        }, { once: true });
      }
    } catch (err) {
      console.error('Error playing audio:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-[#0c1524] p-2 rounded-lg w-[180px]">
      <audio ref={audioRef} src={audioUrl} />
      <Button 
        onClick={togglePlayPause}
        variant="ghost" 
        size="icon"
        className="h-6 w-6 hover:bg-transparent text-gray-300"
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} />}
      </Button>
      <div className="flex-1">
        <div className="relative w-full h-1 bg-gray-700 rounded-full">
          <div 
            className="absolute top-0 left-0 h-full bg-green-500 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;