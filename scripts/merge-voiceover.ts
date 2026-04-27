import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { StoryConfig, StorySpeaker } from "../src/types/story";

function main() {
  const storyPath = process.argv[2];
  if (!storyPath) {
    console.error("Usage: npx tsx scripts/merge-voiceover.ts <story.json>");
    process.exit(1);
  }

  const story: StoryConfig = JSON.parse(readFileSync(storyPath, "utf-8"));

  const FPS = story.fps;
  const INTER_LINE_GAP_MS = story.timing.interLineGapMs;
  const EMPHASIS_GAP_MS = story.timing.emphasisGapMs;
  const AUDIO_DIR = `public/voiceover/${story.storyId}-wip`;
  const OUTPUT_DIR = `public/voiceover/${story.storyId}`;
  const OUTPUT_AUDIO = `${OUTPUT_DIR}/voiceover.mp3`;
  const OUTPUT_TIMELINE = `${OUTPUT_DIR}/timeline.json`;

  // Build speaker lookup
  const speakerMap = new Map<string, StorySpeaker>();
  for (const s of story.speakers) {
    speakerMap.set(s.id, s);
  }

  // Load subtitle files per speaker
  interface SubtitleEntry {
    text: string;
    time_begin: number;
    time_end: number;
  }

  const subtitles = new Map<string, SubtitleEntry[]>();
  for (const speaker of story.speakers) {
    const subPath = join(AUDIO_DIR, `${speaker.name}.subtitle.json`);
    try {
      subtitles.set(speaker.id, JSON.parse(readFileSync(subPath, "utf-8")));
    } catch {
      console.error(`Missing subtitle file: ${subPath}`);
      process.exit(1);
    }
  }

  // Compute per-speaker line indices by iterating story lines in order
  const speakerLineIndex = new Map<string, number>();
  for (const speaker of story.speakers) {
    speakerLineIndex.set(speaker.id, 0);
  }

  // Extract and merge audio clips
  const tmpDir = join(AUDIO_DIR, "_tmp");
  mkdirSync(tmpDir, { recursive: true });

  console.log(`Processing ${story.lines.length} lines...`);

  const timeline: Array<{
    text: string;
    variant: string;
    startMs: number;
    endMs: number;
    startFrame: number;
    endFrame: number;
    speaker: string;
    emphasisColor?: string;
    shakeIntensity?: number;
    beat?: string;
  }> = [];

  let globalOffsetMs = 0;
  const clipPaths: string[] = [];
  const absClipPaths: string[] = [];

  for (let i = 0; i < story.lines.length; i++) {
    const line = story.lines[i];
    const subs = subtitles.get(line.speaker);
    if (!subs) {
      console.error(`No subtitles for speaker: ${line.speaker}`);
      process.exit(1);
    }

    const lineIdx = speakerLineIndex.get(line.speaker)!;
    const sub = subs[lineIdx];

    if (!sub) {
      console.error(`Missing subtitle: ${line.speaker}[${lineIdx}] for line "${line.text}"`);
      process.exit(1);
    }

    speakerLineIndex.set(line.speaker, lineIdx + 1);

    const speaker = speakerMap.get(line.speaker);
    if (!speaker) {
      console.error(`Unknown speaker: ${line.speaker}`);
      process.exit(1);
    }

    const audioPath = join(AUDIO_DIR, `${speaker.name}.mp3`);
    const clipPath = join(tmpDir, `clip-${String(i).padStart(2, "0")}.mp3`);
    const startSec = sub.time_begin / 1000;
    const durationSec = (sub.time_end - sub.time_begin) / 1000;
    const isLast = i === story.lines.length - 1;

    const rawClipPath = join(tmpDir, `raw-${String(i).padStart(2, "0")}.mp3`);
    execSync(
      `ffmpeg -y -i "${audioPath}" -ss ${startSec} -t ${durationSec} -b:a 128k -ar 32000 "${rawClipPath}"`,
      { stdio: "pipe" },
    );

    const padMs = isLast ? 0 : (line.pauseAfterMs ?? (line.variant === "emphasis" ? EMPHASIS_GAP_MS : INTER_LINE_GAP_MS));
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

    const entry: typeof timeline[0] = {
      text: line.text,
      variant: line.variant,
      startMs: globalOffsetMs,
      endMs: globalOffsetMs + (sub.time_end - sub.time_begin),
      startFrame,
      endFrame,
      speaker: line.speaker,
    };

    if (line.emphasisColor) entry.emphasisColor = line.emphasisColor;
    if (line.shakeIntensity !== undefined) entry.shakeIntensity = line.shakeIntensity;
    if (line.beat) entry.beat = line.beat;

    timeline.push(entry);

    const gap = line.pauseAfterMs ?? (line.variant === "emphasis" ? EMPHASIS_GAP_MS : INTER_LINE_GAP_MS);
    globalOffsetMs += sub.time_end - sub.time_begin + (isLast ? 0 : gap);
  }

  // Concatenate all clips
  console.log("Concatenating clips...");

  const concatListPath = join(tmpDir, "concat.txt");
  writeFileSync(concatListPath, absClipPaths.map((p) => `file '${p}'`).join("\n"));

  mkdirSync(OUTPUT_DIR, { recursive: true });

  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -b:a 128k -ar 32000 "${OUTPUT_AUDIO}"`,
    { stdio: "inherit", shell: "/bin/bash" },
  );

  // Write timeline JSON
  const totalDurationMs = globalOffsetMs;
  const totalFrames = Math.round((totalDurationMs / 1000) * FPS);

  writeFileSync(OUTPUT_TIMELINE, JSON.stringify({ fps: FPS, totalDurationMs, totalFrames, lines: timeline }, null, 2));

  // Cleanup
  readdirSync(tmpDir).forEach((f) => unlinkSync(join(tmpDir, f)));
  execSync(`rmdir "${tmpDir}"`);

  console.log(`\nMerged audio: ${OUTPUT_AUDIO}`);
  console.log(`Timeline: ${OUTPUT_TIMELINE}`);
  console.log(`Total duration: ${(totalDurationMs / 1000).toFixed(1)}s (${totalFrames} frames @ ${FPS}fps)`);
  console.log(`Lines: ${timeline.length}`);
}

main();