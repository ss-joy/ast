// components/WaveformPlayer.tsx
import React, { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { Button } from "./ui/button";

interface WaveformPlayerProps {
  audioUrl: string;
}

const WaveformPlayer: React.FC<WaveformPlayerProps> = ({ audioUrl }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);

  useEffect(() => {
    if (waveformRef.current) {
      wavesurfer.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: "#4a9eff",
        progressColor: "#1e429f",
        cursorColor: "#1e429f",
        barWidth: 2,
        barRadius: 3,
        responsive: true,
        height: 50,
        normalize: true,
        partialRender: true,
      });

      wavesurfer.current.load(audioUrl);

      return () => {
        wavesurfer.current?.destroy();
      };
    }
  }, [audioUrl]);

  const handlePlayPause = () => {
    wavesurfer.current?.playPause();
  };

  return (
    <div className="w-full">
      <div ref={waveformRef} />
      <Button onClick={handlePlayPause} className="my-3 bg-cyan-500">
        Play/Pause
      </Button>
    </div>
  );
};

export default WaveformPlayer;
