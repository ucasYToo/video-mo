import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, interpolateColors, staticFile, useCurrentFrame } from "remotion";
import { TypewriterText } from "../../components/TypewriterText/TypewriterText";

interface Line {
  text: string;
  startFrame: number;
  variant?: "normal" | "dialog" | "emphasis";
}

const LINES: Line[] = [
  { text: "我是一个猎妖人。", startFrame: 60, variant: "normal" },
  { text: "祖传的手艺。", startFrame: 80, variant: "normal" },
  { text: "到我这一代快断顿了——", startFrame: 100, variant: "normal" },
  { text: "妖精们学会了用手机。", startFrame: 125, variant: "normal" },

  { text: "我没业务干，每天搓手机。", startFrame: 140, variant: "normal" },
  { text: "顺道谈了个网恋。", startFrame: 180, variant: "normal" },

  { text: "网恋对象叫小鹿，聊了三个月。", startFrame: 200, variant: "normal" },
  { text: "我喜欢的很。", startFrame: 250, variant: "normal" },

  { text: "「你们人为什么要上班？」", startFrame: 260, variant: "dialog" },
  { text: "我说为了吃饭。", startFrame: 310, variant: "normal" },
  { text: "「我不上班也有饭吃。」", startFrame: 335, variant: "dialog" },

  { text: "直到昨晚，", startFrame: 350, variant: "normal" },
  { text: "城郊废弃化工厂，", startFrame: 375, variant: "normal" },
  { text: "追到了那只逃了三天的妖精。", startFrame: 395, variant: "normal" },

  { text: "她蹲在铁架子上，月光一照——", startFrame: 410, variant: "normal" },
  { text: "和我手机屏保长得一毛一样。", startFrame: 470, variant: "normal" },
  { text: "是小鹿。", startFrame: 550, variant: "emphasis" },

  { text: "她看了看我的银弩。", startFrame: 620, variant: "normal" },
  { text: "「你和我在一起这么久，就是想杀我？」", startFrame: 645, variant: "dialog" },
  { text: "喜欢你是真的，但猎妖是职业操守。", startFrame: 705, variant: "normal" },

  { text: "那你不爱我了吗？", startFrame: 740, variant: "emphasis" },

  { text: "我放下弩。", startFrame: 890, variant: "normal" },
  { text: "「要不你委屈一下，别当妖了？」", startFrame: 920, variant: "dialog" },

  { text: "「可以。那你养我。」", startFrame: 1010, variant: "dialog" },
  { text: "我说行，那我也不猎妖了，我去上班给你挣饭钱。", startFrame: 1055, variant: "normal" },

  { text: "后来她告诉我，她早就知道我是猎妖人。", startFrame: 1130, variant: "normal" },

  { text: "那会儿，", startFrame: 1220, variant: "normal" },
  { text: "我真觉得自己坏透了。", startFrame: 1250, variant: "emphasis" },
];

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

const COLOR_FRAMES = [0, 60, 250, 550, 740, 890, 1130, 1250];
const COLOR_VALUES = [
  "#0a0a0a",
  "#0f0f12",
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

const EMOTIONAL_BEATS = [250, 550, 740, 1250];

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

  const titleOpacity = interpolate(frame, [0, 10, 50, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const contributions = useMemo(() => precomputeHeightContributions(frame), [frame]);

  const totalHeight = contributions.reduce((sum, c) => sum + c, 0);
  // 锚点从 50% 渐进滑动到 85%：内容少时居中，越多越向下填充
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

  const heartbeatActive = frame >= 200;
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
      {frame < 70 && (
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
