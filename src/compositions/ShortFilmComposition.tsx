import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, interpolateColors, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { TypewriterText } from "../components/TypewriterText/TypewriterText";
import { TitleCard } from "../components/TitleCard";
import type { StoryConfig } from "../types/story";
import type { TimelineData, TimelineLine } from "../types/timeline";

interface LineData extends TimelineLine {
  startFrame: number;
  endFrame: number;
}

const SHAKE_OFFSETS = [
  { x: 2, y: -1 },
  { x: -3, y: 2 },
  { x: 1, y: -2 },
  { x: -2, y: 3 },
  { x: 3, y: 1 },
  { x: -1, y: -3 },
];

export const ShortFilmComposition: React.FC<{
  config: StoryConfig;
  timeline: TimelineData;
}> = ({ config, timeline }) => {
  const frame = useCurrentFrame();

  const { timing, style, beats } = config;
  const TITLE_DURATION = timing.titleDuration;
  const FADE_DURATION = timing.fadeDuration;
  const SPEED = timing.typewriterSpeed;
  const LINE_HEIGHTS = style.lineHeights;
  const VARIANT_CLASSES = style.variantClasses;
  const VIEWPORT_HEIGHT = 1920 - 64;

  const LINES: LineData[] = useMemo(
    () =>
      timeline.lines.map((l) => ({
        ...l,
        startFrame: l.startFrame + TITLE_DURATION,
        endFrame: l.endFrame + TITLE_DURATION,
      })),
    [timeline.lines, TITLE_DURATION],
  );

  // Build color frames from beats config
  const { colorFrames, colorValues } = useMemo(() => {
    const frames = [0];
    const values = [style.defaultBgColor];
    for (const beat of beats) {
      const firstLine = LINES.find((l) => l.beat === beat.tag);
      if (firstLine) {
        frames.push(firstLine.startFrame);
        values.push(beat.bgColor);
      }
    }
    frames.push(LINES[LINES.length - 1].startFrame);
    values.push(config.bgColorEnd);
    return { colorFrames: frames, colorValues: values };
  }, [LINES, beats, style.defaultBgColor, config.bgColorEnd]);

  const bgColor = interpolateColors(frame, colorFrames, colorValues);

  const titleOpacity = interpolate(frame, [0, 10, TITLE_DURATION - 15, TITLE_DURATION], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contributions = useMemo(() => precomputeHeightContributions(frame), [frame]);

  const totalHeight = contributions.reduce((sum, c) => sum + c, 0);
  const progress = Math.min(1, Math.max(0, totalHeight / VIEWPORT_HEIGHT));
  const anchor = 0.5 + 0.35 * progress;
  const blockOffset = VIEWPORT_HEIGHT * anchor - totalHeight;

  // Shake effect on emphasis lines
  let shakeX = 0;
  let shakeY = 0;
  for (const line of LINES) {
    if (line.variant === "emphasis") {
      const shakeStart = line.startFrame;
      const shakeEnd = shakeStart + 6;
      if (frame >= shakeStart && frame < shakeEnd) {
        const idx = (frame - shakeStart) % SHAKE_OFFSETS.length;
        const intensity = line.shakeIntensity ?? 3;
        shakeX = SHAKE_OFFSETS[idx].x * intensity;
        shakeY = SHAKE_OFFSETS[idx].y * intensity;
      }
    }
  }

  // Heartbeat
  const heartbeatStartLine = LINES.find((l) => l.beat === config.heartbeatStartBeat);
  const heartbeatStart = heartbeatStartLine?.startFrame ?? Infinity;
  const heartbeatActive = frame >= heartbeatStart;
  let heartbeatIntensity = 0;

  if (heartbeatActive) {
    const basePulse = Math.sin(frame * 0.3) * 0.5 + 0.5;
    let beatBoost = 0;
    for (const line of LINES) {
      if (line.beat) {
        const dist = frame - line.startFrame;
        if (dist >= 0 && dist < 45) {
          beatBoost = Math.max(beatBoost, Math.sin((dist / 45) * Math.PI) * 0.6);
        }
      }
    }
    heartbeatIntensity = Math.max(basePulse, beatBoost);
  }

  const heartbeatWidth = heartbeatIntensity * 40;

  const grainOffset = (frame * 0.7) % 200;

  function precomputeHeightContributions(f: number): number[] {
    const c: number[] = [];
    for (const line of LINES) {
      const h = LINE_HEIGHTS[line.variant ?? "normal"];
      c.push(
        h *
          interpolate(f, [line.startFrame, line.startFrame + FADE_DURATION], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
      );
    }
    return c;
  }

  function getLineTop(index: number, conts: number[]): number {
    let top = 0;
    for (let i = 0; i < index; i++) {
      top += conts[i];
    }
    return top;
  }

  const cursorCharMap: Record<string, string> = {
    normal: "|",
    dialog: "|",
    emphasis: "▊",
  };

  return (
    <AbsoluteFill
      className="overflow-hidden px-10"
      style={{ backgroundColor: bgColor, transform: `translate(${shakeX}px, ${shakeY}px)` }}
    >
      {/* Film grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          backgroundPosition: `${grainOffset}px ${grainOffset * 1.3}px`,
        }}
      />

      {/* Top fade mask */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: `linear-gradient(to bottom, ${bgColor}, transparent)` }}
      />

      {/* Bottom fade mask */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: `linear-gradient(to top, ${bgColor}, transparent)` }}
      />

      {/* Title */}
      {frame < TITLE_DURATION && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-30"
          style={{ opacity: titleOpacity }}
        >
          <TitleCard title={config.title} />
        </div>
      )}

      {/* Lines */}
      <div className="absolute inset-0">
        {LINES.map((line, index) => {
          const fadeInStart = line.startFrame;
          const fadeInEnd = line.startFrame + FADE_DURATION;

          const opacity = interpolate(frame, [fadeInStart, fadeInEnd], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          if (opacity <= 0) {
            return null;
          }

          const top = blockOffset + getLineTop(index, contributions);
          const textColor = line.emphasisColor;

          return (
            <div
              key={index}
              className="absolute left-0 right-0 text-center"
              style={{ top, opacity, color: textColor }}
            >
              <div className={`leading-relaxed ${VARIANT_CLASSES[line.variant ?? "normal"]}`}>
                <TypewriterText
                  text={line.text}
                  startFrame={line.startFrame}
                  speed={SPEED}
                  blinkCursor={line.variant === "emphasis"}
                  cursorChar={cursorCharMap[line.variant ?? "normal"]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Voiceover */}
      <Sequence from={TITLE_DURATION}>
        <Audio src={staticFile(`voiceover/${config.storyId}/voiceover.mp3`)} volume={0.9} />
      </Sequence>

      {/* Heartbeat line */}
      {heartbeatActive && (
        <div className="absolute bottom-16 left-[10%] right-[10%] flex items-center justify-center z-20">
          <div className="h-px bg-white/10 w-full" />
          <div
            className="h-0.5 bg-white/40 rounded-full absolute"
            style={{ width: `${heartbeatWidth}%` }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};