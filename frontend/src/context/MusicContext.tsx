import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

interface MusicContextType {
  isPlaying: boolean;
  volume: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  setVolume: (volume: number) => void;
  setVolumePercentage: (percentage: number) => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

interface MusicProviderProps {
  children: ReactNode;
  autoPlay?: boolean;
  defaultVolume?: number;
}

export const MusicProvider: React.FC<MusicProviderProps> = ({ 
  children, 
  autoPlay = false,
  defaultVolume = 0.5
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolumeState] = useState(defaultVolume);

  useEffect(() => {
    // Create audio element
    audioRef.current = new Audio('/sounds/background_music_tmp.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = defaultVolume;

    if (autoPlay) {
      audioRef.current.play().catch((error) => {
        console.log('Auto-play prevented:', error);
        setIsPlaying(false);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const play = () => {
    if (audioRef.current) {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
      setIsPlaying(true);
    }
  };

  const pause = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggle = () => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  };

  const setVolumePercentage = (percentage: number) => {
    const newVolume = volume * (percentage / 100);
    setVolume(newVolume);
  };



  return (
    <MusicContext.Provider value={{ isPlaying, volume, play, pause, toggle, setVolume, setVolumePercentage }}>
      {children}
    </MusicContext.Provider>
  );
};

export const useMusic = (): MusicContextType => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
};
