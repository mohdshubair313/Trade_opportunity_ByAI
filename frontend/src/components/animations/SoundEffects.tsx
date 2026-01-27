"use client";

import { useEffect, useRef, useState } from "react";

// Sound effects configuration
const SOUNDS = {
  click: "https://assets.mixkit.co/active_storage/sfx/2587/2587-preview.mp3",
  hover: "https://assets.mixkit.co/active_storage/sfx/2588/2588-preview.mp3",
  success: "https://assets.mixkit.co/active_storage/sfx/2589/2589-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2590/2590-preview.mp3",
  notification: "https://assets.mixkit.co/active_storage/sfx/2591/2591-preview.mp3",
};

interface SoundEffectsProps {
  children: React.ReactNode;
}

export function SoundEffects({ children }: SoundEffectsProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Initialize audio elements
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.volume = 0.3; // Default volume (30%)
      audioRefs.current[key] = audio;
    });

    // Check if user has sound enabled in localStorage
    const savedSoundSetting = localStorage.getItem("soundEnabled");
    if (savedSoundSetting !== null) {
      setSoundEnabled(savedSoundSetting === "true");
    }

    // Cleanup
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  const playSound = (sound: keyof typeof SOUNDS) => {
    if (!soundEnabled) return;
    
    const audio = audioRefs.current[sound];
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.warn("Audio playback failed:", error);
        });
      } catch (error) {
        console.warn("Audio playback failed:", error);
      }
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("soundEnabled", String(newState));
  };

  // Create context to provide sound functionality to children
  const SoundContext = (() => {
    try {
      // Create a simple context for sound effects
      const context = {
        playSound,
        soundEnabled,
        toggleSound,
      };

      return context;
    } catch (error) {
      console.warn("Context creation failed:", error);
      return {
        playSound: () => {},
        soundEnabled: false,
        toggleSound: () => {},
      };
    }
  })();

  // Provide sound effects through a custom context
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <div 
        className="sound-effects-wrapper"
        style={{ 
          display: 'contents',
          // Add hidden inputs to capture events for sound effects
        }}
      >
        {children}
      </div>
    );
  };

  return (
    <Wrapper>
      {children}
    </Wrapper>
  );
}

// Hook to use sound effects
export function useSoundEffects() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});

  useEffect(() => {
    // Initialize audio elements
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.volume = 0.3; // Default volume (30%)
      audioRefs.current[key] = audio;
    });

    // Check if user has sound enabled in localStorage
    const savedSoundSetting = localStorage.getItem("soundEnabled");
    if (savedSoundSetting !== null) {
      setSoundEnabled(savedSoundSetting === "true");
    }

    // Cleanup
    return () => {
      Object.values(audioRefs.current).forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
      });
    };
  }, []);

  const playSound = (sound: keyof typeof SOUNDS) => {
    if (!soundEnabled) return;
    
    const audio = audioRefs.current[sound];
    if (audio) {
      try {
        audio.currentTime = 0;
        audio.play().catch((error) => {
          console.warn("Audio playback failed:", error);
        });
      } catch (error) {
        console.warn("Audio playback failed:", error);
      }
    }
  };

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("soundEnabled", String(newState));
  };

  return {
    playSound,
    soundEnabled,
    toggleSound,
  };
}
