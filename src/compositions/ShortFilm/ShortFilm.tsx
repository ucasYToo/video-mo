import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, interpolateColors, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Audio } from "@remotion/media";
import { TypewriterText } from "../../components/TypewriterText/TypewriterText";
import timelineRaw from "../../../public/voiceover/ShortFilm/timeline.json";

interface TimelineLine {
  text: string;
  variant: string;
  startFrame: number;
  endFrame: number;
  source: string;
}

interface TimelineData {
  fps: number;
  totalDurationMs: number;
  totalFrames: number;
  lines: TimelineLine[];
}

const timeline = timelineRaw as TimelineData;

const TITLE_DURATION = 60;

const LINES: Array<{ text: string; startFrame: number; endFrame: number; variant: "normal" | "dialog" | "emphasis"; source: string }> =
  timeline.lines.map((l) => ({
    text: l.text,
    startFrame: l.startFrame + TITLE_DURATION,
    endFrame: l.endFrame + TITLE_DURATION,
    variant: l.variant as "normal" | "dialog" | "emphasis",
    source: l.source,
  }));

const SPEED = 1;
const FADE_DURATION = 4;

const LINE_HEIGHTS: Record<string, number> = {
  normal: 78,
  dialog: 65,
  emphasis: 157,
};

const VIEWPORT_HEIGHT = 1920 - 64;

const SHAKE_OFFSETS = [
  { x: 2, y: -1 },
  { x: -3, y: 2 },
  { x: 1, y: -2 },
  { x: -2, y: 3 },
  { x: 3, y: 1 },
  { x: -1, y: -3 },
];

// Dynamic color frames based on timeline key moments
const romanceFrame = LINES.find((l) => l.text.includes("小鹿") && l.text.includes("网恋"))!.startFrame;
const discoveryFrame = LINES.find((l) => l.text === "是小鹿。")!.startFrame;
const confrontationFrame = LINES.find((l) => l.text.includes("不爱我"))!.startFrame;
const resolutionFrame = LINES.find((l) => l.text.includes("放下弩"))!.startFrame;
const epilogueFrame = LINES.find((l) => l.text.includes("后来她告诉我"))!.startFrame;
const endFrame = LINES[LINES.length - 1].startFrame;

const COLOR_FRAMES = [0, romanceFrame, discoveryFrame, confrontationFrame, resolutionFrame, epilogueFrame, endFrame];
const COLOR_VALUES = [
  "#0a0a0a",
  "#1a1410",
  "#0a1a18",
  "#1a0808",
  "#1a1512",
  "#0a0a0f",
  "#020202",
];

const variantClassMap: Record<string, string> = {
  normal: "text-[48px] font-normal text-gray-200 font-serif",
  dialog: "text-[40px] font-normal text-gray-300 font-serif tracking-wide",
  emphasis: "text-[72px] font-bold font-serif tracking-wider mt-4 mb-6",
};

function getEmphasisColor(text: string): string {
  if (text.includes("小鹿") && text.length < 6) return "#4ecdc4";
  if (text.includes("不爱我")) return "#ff6b6b";
  if (text.includes("坏透了")) return "#bdc3c7";
  return "#ffffff";
}

const cursorCharMap: Record<string, string> = {
  normal: "|",
  dialog: "|",
  emphasis: "▊",
};

const EMOTIONAL_BEATS = [
  LINES.find((l) => l.text.includes("我喜欢的很"))!.startFrame,
  LINES.find((l) => l.text === "是小鹿。")!.startFrame,
  LINES.find((l) => l.text.includes("不爱我"))!.startFrame,
  LINES[LINES.length - 1].startFrame,
];

function precomputeHeightContributions(frame: number): number[] {
  const contributions: number[] = [];
  for (const line of LINES) {
    const h = LINE_HEIGHTS[line.variant ?? "normal"];
    contributions.push(
      h *
        interpolate(frame, [line.startFrame, line.startFrame + FADE_DURATION], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
    );
  }
  return contributions;
}

function getLineTop(index: number, contributions: number[]): number {
  let top = 0;
  for (let i = 0; i < index; i++) {
    top += contributions[i];
  }
  return top;
}

export const ShortFilm: React.FC = () => {
  const frame = useCurrentFrame();

  const bgColor = interpolateColors(frame, COLOR_FRAMES, COLOR_VALUES);

  const titleOpacity = interpolate(frame, [0, 10, TITLE_DURATION - 15, TITLE_DURATION], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contributions = useMemo(() => precomputeHeightContributions(frame), [frame]);

  const totalHeight = contributions.reduce((sum, c) => sum + c, 0);
  const progress = Math.min(1, Math.max(0, totalHeight / VIEWPORT_HEIGHT));
  const anchor = 0.5 + 0.35 * progress;
  const blockOffset = VIEWPORT_HEIGHT * anchor - totalHeight;

  let shakeX = 0;
  let shakeY = 0;
  for (const line of LINES) {
    if (line.variant === "emphasis") {
      const shakeStart = line.startFrame;
      const shakeEnd = shakeStart + 6;
      if (frame >= shakeStart && frame < shakeEnd) {
        const idx = (frame - shakeStart) % SHAKE_OFFSETS.length;
        const intensity = line.text.includes("小鹿") ? 1.5 : 3;
        shakeX = SHAKE_OFFSETS[idx].x * intensity;
        shakeY = SHAKE_OFFSETS[idx].y * intensity;
      }
    }
  }

  const heartbeatStart = LINES.find((l) => l.text.includes("网恋"))!.startFrame;
  const heartbeatActive = frame >= heartbeatStart;
  let heartbeatIntensity = 0;

  if (heartbeatActive) {
    const basePulse = Math.sin(frame * 0.3) * 0.5 + 0.5;

    let beatBoost = 0;
    for (const beat of EMOTIONAL_BEATS) {
      const dist = frame - beat;
      if (dist >= 0 && dist < 45) {
        beatBoost = Math.max(beatBoost, Math.sin((dist / 45) * Math.PI) * 0.6);
      }
    }
    heartbeatIntensity = Math.max(basePulse, beatBoost);
  }

  const heartbeatWidth = heartbeatIntensity * 40;

  const grainOffset = (frame * 0.7) % 200;

  return (
    <AbsoluteFill
      className="overflow-hidden px-10"
      style={{ backgroundColor: bgColor, transform: `translate(${shakeX}px, ${shakeY}px)` }}
    >
      {/* 电影颗粒 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.025,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          backgroundPosition: `${grainOffset}px ${grainOffset * 1.3}px`,
        }}
      />

      {/* 顶部渐隐遮罩 */}
      <div
        className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: `linear-gradient(to bottom, ${bgColor}, transparent)` }}
      />

      {/* 底部渐隐遮罩 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
        style={{ background: `linear-gradient(to top, ${bgColor}, transparent)` }}
      />

      {/* 标题画面 */}
      {frame < TITLE_DURATION && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center z-30"
          style={{ opacity: titleOpacity }}
        >
          <div className="text-[32px] text-gray-500 tracking-[0.5em] font-serif mb-8">
            猎妖人
          </div>
          <div className="text-[80px] font-bold text-white tracking-wider font-serif">
            职业道德问题
          </div>
          <Img
            src={staticFile("calligraphy.png")}
            className="mt-10"
            style={{ maxWidth: 360, maxHeight: 200, objectFit: "contain" }}
          />
          <div className="w-20 h-px bg-white/20 mt-10" />
        </div>
      )}

      {/* 文字内容 */}
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

          const textColor =
            line.variant === "emphasis" ? getEmphasisColor(line.text) : undefined;

          return (
            <div
              key={index}
              className="absolute left-0 right-0 text-center"
              style={{ top, opacity, color: textColor }}
            >
              <div
                className={`leading-relaxed ${
                  variantClassMap[line.variant ?? "normal"]
                }`}
              >
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

      {/* 配音 */}
      <Sequence from={TITLE_DURATION}>
        <Audio src={staticFile("voiceover/ShortFilm/voiceover.mp3")} volume={0.9} />
      </Sequence>

      {/* 底部心跳线 */}
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