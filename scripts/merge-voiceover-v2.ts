import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const FPS = 30;
const AUDIO_DIR = "public/voiceover/ShortFilm-v2";
const OUTPUT_DIR = "public/voiceover/ShortFilm";
const OUTPUT_AUDIO = "public/voiceover/ShortFilm/voiceover.mp3";
const OUTPUT_TIMELINE = "public/voiceover/ShortFilm/timeline.json";

// Story order: each entry maps to a subtitle line in either male or female track
// "M{n}" = male subtitle index, "F{n}" = female subtitle index
const STORY_ORDER: Array<{ source: "M" | "F"; lineIndex: number; text: string; variant: "normal" | "dialog" | "emphasis" }> = [
  { source: "M", lineIndex: 0, text: "我是一个猎妖人。", variant: "normal" },
  { source: "M", lineIndex: 1, text: "祖传的手艺。", variant: "normal" },
  { source: "M", lineIndex: 2, text: "到我这一代快断顿了——", variant: "normal" },
  { source: "M", lineIndex: 3, text: "妖精们学会了用手机。", variant: "normal" },
  { source: "M", lineIndex: 4, text: "我没业务干，每天搓手机。", variant: "normal" },
  { source: "M", lineIndex: 5, text: "顺道谈了个网恋。", variant: "normal" },
  { source: "M", lineIndex: 6, text: "网恋对象叫小鹿，聊了三个月。", variant: "normal" },
  { source: "M", lineIndex: 7, text: "我喜欢的很。", variant: "normal" },
  { source: "F", lineIndex: 0, text: "「你们人为什么要上班？」", variant: "dialog" },
  { source: "M", lineIndex: 8, text: "我说为了吃饭。", variant: "normal" },
  { source: "F", lineIndex: 1, text: "「我不上班也有饭吃。」", variant: "dialog" },
  { source: "M", lineIndex: 9, text: "直到昨晚，", variant: "normal" },
  { source: "M", lineIndex: 10, text: "城郊废弃化工厂，", variant: "normal" },
  { source: "M", lineIndex: 11, text: "追到了那只逃了三天的妖精。", variant: "normal" },
  { source: "M", lineIndex: 12, text: "她蹲在铁架子上，月光一照——", variant: "normal" },
  { source: "M", lineIndex: 13, text: "和我手机屏保长得一毛一样。", variant: "normal" },
  { source: "M", lineIndex: 14, text: "是小鹿。", variant: "emphasis" },
  { source: "M", lineIndex: 15, text: "她看了看我的银弩。", variant: "normal" },
  { source: "F", lineIndex: 2, text: "「你和我在一起这么久，就是想杀我？」", variant: "dialog" },
  { source: "M", lineIndex: 16, text: "喜欢你是真的，但猎妖是职业操守。", variant: "normal" },
  { source: "F", lineIndex: 3, text: "那你不爱我了吗？", variant: "emphasis" },
  { source: "M", lineIndex: 17, text: "我放下弩。", variant: "normal" },
  { source: "M", lineIndex: 18, text: "「要不你委屈一下，别当妖了？」", variant: "dialog" },
  { source: "F", lineIndex: 4, text: "「可以。那你养我。」", variant: "dialog" },
  { source: "M", lineIndex: 19, text: "我说行，那我也不猎妖了，我去上班给你挣饭钱。", variant: "normal" },
  { source: "M", lineIndex: 20, text: "后来她告诉我，她早就知道我是猎妖人。", variant: "normal" },
  { source: "M", lineIndex: 21, text: "那会儿，", variant: "normal" },
  { source: "M", lineIndex: 22, text: "我真觉得自己坏透了。", variant: "emphasis" },
];

interface SubtitleEntry {
  text: string;
  time_begin: number;
  time_end: number;
}

const maleSubtitles: SubtitleEntry[] = JSON.parse(
  readFileSync(join(AUDIO_DIR, "male.subtitle.json"), "utf-8"),
);
const femaleSubtitles: SubtitleEntry[] = JSON.parse(
  readFileSync(join(AUDIO_DIR, "female.subtitle.json"), "utf-8"),
);

const getSubtitles = (source: "M" | "F") =>
  source === "M" ? maleSubtitles : femaleSubtitles;
const getAudioPath = (source: "M" | "F") =>
  join(AUDIO_DIR, source === "M" ? "male.mp3" : "female.mp3");

// Step 1: Extract each line as individual audio clip using FFmpeg
const tmpDir = join(AUDIO_DIR, "_tmp");
mkdirSync(tmpDir, { recursive: true });

console.log(`Extracting ${STORY_ORDER.length} audio clips...`);

const timeline: Array<{
  text: string;
  variant: string;
  startMs: number;
  endMs: number;
  startFrame: number;
  endFrame: number;
  source: string;
}> = [];

const INTER_LINE_GAP_MS = 300;
const EMPHASIS_GAP_MS = 2000;

let globalOffsetMs = 0;
const clipPaths: string[] = [];
const absClipPaths: string[] = [];

for (let i = 0; i < STORY_ORDER.length; i++) {
  const entry = STORY_ORDER[i];
  const subs = getSubtitles(entry.source);
  const sub = subs[entry.lineIndex];

  if (!sub) {
    console.error(`Missing subtitle: ${entry.source}[${entry.lineIndex}]`);
    process.exit(1);
  }

  const audioPath = getAudioPath(entry.source);
  const clipPath = join(tmpDir, `clip-${String(i).padStart(2, "0")}.mp3`);
  const startSec = sub.time_begin / 1000;
  const durationSec = (sub.time_end - sub.time_begin) / 1000;
  const isLast = i === STORY_ORDER.length - 1;

  // Extract this segment, then pad with silence for inter-line gap
  const rawClipPath = join(tmpDir, `raw-${String(i).padStart(2, "0")}.mp3`);
  execSync(
    `ffmpeg -y -i "${audioPath}" -ss ${startSec} -t ${durationSec} -b:a 128k -ar 32000 "${rawClipPath}"`,
    { stdio: "pipe" },
  );

  // Add silence padding at the end (except last clip)
  const padMs = isLast ? 0 : (entry.variant === "emphasis" ? EMPHASIS_GAP_MS : INTER_LINE_GAP_MS);
  if (padMs > 0) {
    execSync(
      `ffmpeg -y -i "${rawClipPath}" -filter_complex "apad=whole_dur=${durationSec + padMs / 1000}" -b:a 128k -ar 32000 "${clipPath}"`,
      { stdio: "pipe" },
    );
  } else {
    execSync(`cp "${rawClipPath}" "${clipPath}"`);
  }

  clipPaths.push(clipPath);
  absClipPaths.push(join(process.cwd(), clipPath));

  const startFrame = Math.round((globalOffsetMs / 1000) * FPS);
  const endFrame = Math.round(((globalOffsetMs + sub.time_end - sub.time_begin) / 1000) * FPS);

  timeline.push({
    text: entry.text,
    variant: entry.variant,
    startMs: globalOffsetMs,
    endMs: globalOffsetMs + (sub.time_end - sub.time_begin),
    startFrame,
    endFrame,
    source: entry.source,
  });

  globalOffsetMs += sub.time_end - sub.time_begin + (entry.variant === "emphasis" ? EMPHASIS_GAP_MS : INTER_LINE_GAP_MS);
}

// Step 2: Concatenate all clips into one audio track
console.log("Concatenating clips...");

const concatListPath = join(tmpDir, "concat.txt");
const concatEntries = absClipPaths.map((p) => `file '${p}'`);
writeFileSync(concatListPath, concatEntries.join("\n"));

mkdirSync(join(OUTPUT_DIR), { recursive: true });

execSync(
  `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -b:a 128k -ar 32000 "${OUTPUT_AUDIO}"`,
  { stdio: "inherit", shell: "/bin/bash" },
);

// Step 3: Write timeline JSON
const totalDurationMs = globalOffsetMs - INTER_LINE_GAP_MS;
const totalFrames = Math.round((totalDurationMs / 1000) * FPS);

const timelineOutput = {
  fps: FPS,
  totalDurationMs,
  totalFrames,
  lines: timeline,
};

writeFileSync(OUTPUT_TIMELINE, JSON.stringify(timelineOutput, null, 2));

// Cleanup
readdirSync(tmpDir).forEach((f) => unlinkSync(join(tmpDir, f)));
execSync(`rmdir "${tmpDir}"`);

console.log(`\nMerged audio: ${OUTPUT_AUDIO}`);
console.log(`Timeline: ${OUTPUT_TIMELINE}`);
console.log(`Total duration: ${(totalDurationMs / 1000).toFixed(1)}s (${totalFrames} frames @ ${FPS}fps)`);
console.log(`Lines: ${timeline.length}`);