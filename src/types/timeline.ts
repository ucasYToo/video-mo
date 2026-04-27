export interface TimelineLine {
  text: string;
  variant: string;
  startMs: number;
  endMs: number;
  startFrame: number;
  endFrame: number;
  speaker?: string;
  source?: string;
  emphasisColor?: string;
  shakeIntensity?: number;
  beat?: string;
}

export interface TimelineData {
  fps: number;
  totalDurationMs: number;
  totalFrames: number;
  lines: TimelineLine[];
}