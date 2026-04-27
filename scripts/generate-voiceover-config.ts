import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import type { StoryConfig, StoryLine } from "../src/types/story";

function main() {
  const storyPath = process.argv[2];
  if (!storyPath) {
    console.error("Usage: npx tsx scripts/generate-voiceover-config.ts <story.json>");
    process.exit(1);
  }

  const story: StoryConfig = JSON.parse(readFileSync(storyPath, "utf-8"));

  // Group lines by speaker
  const speakerLines = new Map<string, StoryLine[]>();
  for (const line of story.lines) {
    const group = speakerLines.get(line.speaker) ?? [];
    group.push(line);
    speakerLines.set(line.speaker, group);
  }

  // Build scenes: one per speaker, text joined with pause markers
  const scenes: Array<{
    id: string;
    text: string;
    voice_setting?: { voice_id: string };
  }> = [];

  for (const speaker of story.speakers) {
    const lines = speakerLines.get(speaker.id);
    if (!lines || lines.length === 0) continue;

    const parts: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      parts.push(lines[i].text);
      if (i < lines.length - 1) {
        const pauseMs = lines[i].pauseAfterMs
          ?? (lines[i].variant === "emphasis" ? story.timing.emphasisGapMs : story.timing.interLineGapMs);
        parts.push(`<#${(pauseMs / 1000).toFixed(1)}#>`);
      }
    }

    const scene: typeof scenes[0] = {
      id: speaker.name,
      text: parts.join(""),
    };

    // Non-first speakers get a voice override
    if (scenes.length > 0) {
      scene.voice_setting = { voice_id: speaker.voiceId };
    }

    scenes.push(scene);
  }

  // First speaker provides global voice_setting
  const firstSpeaker = story.speakers.find((s) => speakerLines.has(s.id));

  const config = {
    composition_id: `${story.storyId}-wip`,
    model: "speech-2.8-turbo",
    stream: false,
    voice_setting: {
      voice_id: firstSpeaker?.voiceId ?? "Chinese (Mandarin)_Lyrical_Voice",
      speed: firstSpeaker?.speed ?? 1.8,
      vol: 1,
      pitch: 0,
      language_boost: "Chinese",
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
    output_format: "hex",
    subtitle_enable: true,
    scenes,
  };

  const outDir = join(dirname(storyPath));
  const outPath = join(outDir, "voiceover.json");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, JSON.stringify(config, null, 2));

  console.log(`Voiceover config written to: ${outPath}`);
  console.log(`Scenes: ${scenes.length}`);
  for (const scene of scenes) {
    console.log(`  ${scene.id}: ${scene.text.length} chars`);
  }
}

main();