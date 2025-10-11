import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface RewardSoundContextType {
  volume: number;
  playSound: () => void;
  setVolume: (volume: number) => void;
}

const RewardSoundContext = createContext<RewardSoundContextType | undefined>(undefined);

interface RewardSoundProviderProps {
  children: ReactNode;
  soundPath?: string;
  defaultVolume?: number;
}

export const RewardSoundProvider: React.FC<RewardSoundProviderProps> = ({ 
  children, 
  soundPath = '/sounds/gesture_match.mp3',
  defaultVolume = 0.5 
}) => {
  const [volume, setVolumeState] = useState(defaultVolume);

  const playSound = () => {
    // Create a new Audio instance each time to allow overlapping sounds
    const audio = new Audio(soundPath);
    audio.volume = volume;
    
    audio.play().catch((error) => {
      console.error('Error playing reward sound:', error);
    });

    // Clean up after the sound finishes
    audio.addEventListener('ended', () => {
      audio.remove();
    });
  };

  const setVolume = (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
  };

  return (
    <RewardSoundContext.Provider value={{ volume, playSound, setVolume }}>
      {children}
    </RewardSoundContext.Provider>
  );
};

export const useRewardSound = (): RewardSoundContextType => {
  const context = useContext(RewardSoundContext);
  if (!context) {
    throw new Error('useRewardSound must be used within a RewardSoundProvider');
  }
  return context;
};
