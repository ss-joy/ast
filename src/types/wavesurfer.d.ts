// types/wavesurfer.d.ts
declare module "wavesurfer.js" {
  interface WaveSurferOptions {
    container: string | HTMLElement;
    waveColor?: string;
    progressColor?: string;
    cursorColor?: string;
    barWidth?: number;
    barRadius?: number;
    responsive?: boolean;
    height?: number;
    normalize?: boolean;
    partialRender?: boolean;
  }

  class WaveSurfer {
    static create(options: WaveSurferOptions): WaveSurfer;
    load(url: string): void;
    playPause(): void;
    destroy(): void;
  }

  export default WaveSurfer;
}
