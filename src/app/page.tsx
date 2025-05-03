'use client';

import type React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Play, Pause } from 'lucide-react';

const MIN_BPM = 40;
const MAX_BPM = 240;
const DEFAULT_BPM = 120;

export default function Home() {
  const [bpm, setBpm] = useState<number>(DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [beatVisualizer, setBeatVisualizer] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const nextBeatTimeRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Function to create and start AudioContext safely on user interaction
  const initializeAudioContext = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser", e);
      }
    }
  }, []);

  // Function to schedule and play a click sound
  const playClick = useCallback((time: number) => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine'; // Short sharp sound
    oscillator.frequency.setValueAtTime(1000, time); // High pitch click
    gainNode.gain.setValueAtTime(1, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05); // Quick decay

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }, []);


  // Scheduler function
  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    const context = audioContextRef.current;
    const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

    while (nextBeatTimeRef.current < context.currentTime + scheduleAheadTime) {
      playClick(nextBeatTimeRef.current);
      // Trigger visual feedback slightly ahead or exactly on time
      const visualTimeout = Math.max(0, (nextBeatTimeRef.current - context.currentTime) * 1000 - 10); // Adjust timing slightly if needed
      setTimeout(() => {
          setBeatVisualizer(true);
          setTimeout(() => setBeatVisualizer(false), 50); // Duration of visual pulse
      }, visualTimeout);

      const secondsPerBeat = 60.0 / bpm;
      nextBeatTimeRef.current += secondsPerBeat;
    }

    intervalRef.current = setTimeout(scheduler, 25); // Check scheduling buffer every 25ms
  }, [bpm, playClick]);


  // Start metronome
  const startMetronome = useCallback(() => {
    initializeAudioContext(); // Ensure AudioContext is ready
    if (!audioContextRef.current) {
       console.error("AudioContext could not be initialized.");
       return;
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    nextBeatTimeRef.current = audioContextRef.current.currentTime + 0.1; // Start scheduling shortly after pressing play
    scheduler();
    setIsPlaying(true);
  }, [initializeAudioContext, scheduler]);

  // Stop metronome
  const stopMetronome = useCallback(() => {
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state === 'running') {
       // Suspend context to save resources, don't close it fully
       // audioContextRef.current.suspend();
    }
    setIsPlaying(false);
    setBeatVisualizer(false); // Ensure visualizer is off
  }, []);

  // Effect to handle starting/stopping based on isPlaying state
  useEffect(() => {
    if (isPlaying) {
      startMetronome();
    } else {
      stopMetronome();
    }
    // Cleanup function to stop metronome when component unmounts or isPlaying changes to false
    return () => {
      stopMetronome();
    };
  }, [isPlaying, startMetronome, stopMetronome]);


  // Effect to clean up AudioContext on component unmount
   useEffect(() => {
    const currentAudioContext = audioContextRef.current;
    return () => {
      if (currentAudioContext) {
        currentAudioContext.close().catch(e => console.error("Error closing AudioContext", e));
        audioContextRef.current = null; // Clear the ref
      }
    };
  }, []);


  const handleBpmChange = (value: number | string) => {
    const newBpm = typeof value === 'string' ? parseInt(value, 10) : value;
    if (!isNaN(newBpm) && newBpm >= MIN_BPM && newBpm <= MAX_BPM) {
      setBpm(newBpm);
    } else if (typeof value === 'string' && value === '') {
       // Allow clearing the input, maybe set a default or handle appropriately
       // For now, let's prevent setting below MIN_BPM implicitly by empty input
    } else if (!isNaN(newBpm) && newBpm < MIN_BPM) {
        setBpm(MIN_BPM);
    } else if (!isNaN(newBpm) && newBpm > MAX_BPM) {
        setBpm(MAX_BPM);
    }
  };

  const handleSliderChange = (value: number[]) => {
    handleBpmChange(value[0]);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleBpmChange(event.target.value);
  };

   const handleInputBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value, 10);
    if (isNaN(value) || value < MIN_BPM) {
      setBpm(MIN_BPM);
    } else if (value > MAX_BPM) {
      setBpm(MAX_BPM);
    }
  };


  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <h1 className="text-2xl">Hello world</h1>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">RhythmicPulse</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {/* Visual Beat Indicator */}
          <div
            className={`w-16 h-16 rounded-full bg-accent transition-all duration-100 ease-in-out ${
              beatVisualizer ? 'opacity-100 scale-110' : 'opacity-20 scale-100'
            }`}
            aria-hidden="true"
          />

          {/* Tempo Display */}
          <div className="text-6xl font-mono font-bold text-primary">{bpm}</div>
          <div className="text-sm text-muted-foreground -mt-4">BPM</div>

          {/* Tempo Slider */}
          <div className="w-full px-4 space-y-2">
            <Label htmlFor="bpm-slider" className="sr-only">Tempo Slider</Label>
            <Slider
              id="bpm-slider"
              min={MIN_BPM}
              max={MAX_BPM}
              step={1}
              value={[bpm]}
              onValueChange={handleSliderChange}
              className="[&>span:first-child]:h-2 [&>span:first-child>span]:bg-accent [&>span:last-child]:bg-accent [&>span:last-child]:ring-offset-background"
              aria-label={`Tempo: ${bpm} BPM`}
            />
             <div className="flex justify-between text-xs text-muted-foreground">
               <span>{MIN_BPM}</span>
               <span>{MAX_BPM}</span>
             </div>
          </div>


          {/* Tempo Input */}
          <div className="w-32">
            <Label htmlFor="bpm-input" className="sr-only">Tempo Input</Label>
            <Input
              id="bpm-input"
              type="number"
              min={MIN_BPM}
              max={MAX_BPM}
              value={bpm}
              onChange={handleInputChange}
              onBlur={handleInputBlur} // Handle blur to correct invalid input
              className="text-center text-lg font-mono border-input focus:ring-accent"
              aria-label="Tempo input in BPM"
            />
          </div>


          {/* Start/Stop Button */}
          <Button
            onClick={togglePlay}
            className="w-24 h-12 bg-accent text-accent-foreground hover:bg-accent/90 focus:ring-accent"
            aria-label={isPlaying ? 'Pause metronome' : 'Start metronome'}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            <span className="ml-2">{isPlaying ? 'Stop' : 'Start'}</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
