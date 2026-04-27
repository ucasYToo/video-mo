export interface StorySpeaker {
  id: string;
  name: string;
  voiceId: string;
  speed?: number;
}

export interface StoryLine {
  speaker: string;
  text: string;
  variant: "normal" | "dialog" | "emphasis";
  emphasisColor?: string;
  shakeIntensity?: number;
  beat?: string;
  pauseAfterMs?: number;
}

export interface StoryBeat {
  tag: string;
  bgColor: string;
  heartbeat: boolean;
}

export interface StoryTiming {
  titleDuration: number;
  fadeDuration: number;
  bufferFrames: number;
  typewriterSpeed: number;
  interLineGapMs: number;
  emphasisGapMs: number;
}

export interface StoryStyle {
  lineHeights: Record<string, number>;
  defaultBgColor: string;
  variantClasses: Record<string, string>;
}

export interface StoryTitle {
  lines: string[];
  image?: string;
}

export interface StoryConfig {
  storyId: string;
  fps: number;
  title: StoryTitle;
  timing: StoryTiming;
  style: StoryStyle;
  speakers: StorySpeaker[];
  lines: StoryLine[];
  beats: StoryBeat[];
  bgColorEnd: string;
  heartbeatStartBeat: string;
}