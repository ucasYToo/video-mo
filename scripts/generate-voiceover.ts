import { writeFileSync, mkdirSync, readFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";

// ---------------------------------------------------------------------------
// .env file support
// ---------------------------------------------------------------------------

function loadEnvFile(dir: string): Record<string, string> {
  const envPath = join(dir, ".env");
  const env: Record<string, string> = {};
  try {
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const val = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, "");
      env[key] = val;
    }
  } catch {
    // .env file is optional
  }
  return env;
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

let logFilePath: string | null = null;

function initLogger(path: string) {
  logFilePath = path;
  writeFileSync(path, "");
}

function log(msg: string) {
  const timestamped = `[${new Date().toISOString()}] ${msg}`;
  console.log(timestamped);
  if (logFilePath) appendFileSync(logFilePath, timestamped + "\n");
}

function logError(msg: string) {
  const timestamped = `[${new Date().toISOString()}] ERROR ${msg}`;
  console.error(timestamped);
  if (logFilePath) appendFileSync(logFilePath, timestamped + "\n");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VoiceSetting {
  voice_id: string;
  speed?: number; // [0.5, 2], default 1
  vol?: number; // (0, 10], default 1
  pitch?: number; // [-12, 12], default 0
  emotion?: "happy" | "sad" | "angry" | "fearful" | "disgusted" | "surprised" | "calm" | "fluent" | "whisper";
  language_boost?: string | null;
}

interface AudioSetting {
  sample_rate?: number; // [8000, 16000, 22050, 24000, 32000, 44100], default 32000
  bitrate?: number; // [32000, 64000, 128000, 256000], default 128000
  format?: "mp3" | "pcm" | "flac" | "wav"; // default mp3
  channel?: 1 | 2; // default 1
}

interface SceneConfig {
  id: string; // 场景标识，用于文件命名
  text: string; // 合成文本
  voice_setting?: Partial<VoiceSetting>; // 可覆盖全局设置
}

export interface VoiceoverConfig {
  composition_id: string; // composition 标识，输出目录以此为名
  model?: string; // 默认 speech-2.8-hd
  stream?: boolean; // 默认 false
  voice_setting?: VoiceSetting; // 全局音色设置
  audio_setting?: AudioSetting; // 全局音频设置
  output_format?: "hex" | "url"; // 非流式可用 url，默认 hex
  subtitle_enable?: boolean; // 是否生成字幕，默认 false
  scenes: SceneConfig[];
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

const API_ENDPOINTS = [
  "https://api.minimaxi.com/v1/t2a_v2",
  "https://api-bj.minimaxi.com/v1/t2a_v2",
];

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function callT2AApi(
  payload: Record<string, unknown>,
  apiKey: string,
): Promise<{ audioHex: string; audioLengthMs: number; audioFormat: string; usageCharacters: number; subtitleFile: string | undefined }> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let lastError: Error | null = null;

    for (const endpoint of API_ENDPOINTS) {
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const result = (await response.json()) as {
          base_resp?: { status_code: number; status_msg: string };
          data: { audio: string; subtitle_file?: string };
          extra_info?: {
            audio_length: number;
            audio_format: string;
            usage_characters: number;
          };
        };

        if (result.base_resp?.status_code !== 0) {
          throw new Error(
            `API error ${result.base_resp?.status_code}: ${result.base_resp?.status_msg}`,
          );
        }

        return {
          audioHex: result.data.audio,
          audioLengthMs: result.extra_info?.audio_length ?? 0,
          audioFormat: result.extra_info?.audio_format ?? (payload.audio_setting as AudioSetting | undefined)?.format ?? "mp3",
          usageCharacters: result.extra_info?.usage_characters ?? 0,
          subtitleFile: result.data.subtitle_file,
        };
      } catch (err) {
        lastError = err as Error;
        logError(`Endpoint ${endpoint} failed: ${(err as Error).message}`);
      }
    }

    if (lastError?.message.includes("1002") && attempt < MAX_RETRIES - 1) {
      log(`Rate limited, retrying in ${RETRY_DELAY_MS / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      continue;
    }
  }

  throw new Error(`All retries exhausted. Last error: rate limit exceeded`);
}

// ---------------------------------------------------------------------------
// Hex → Buffer
// ---------------------------------------------------------------------------

function hexToBuffer(hex: string): Buffer {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Buffer.from(clean, "hex");
}

// ---------------------------------------------------------------------------
// Merge voice settings (scene-level overrides global)
// ---------------------------------------------------------------------------

function mergeVoiceSetting(
  global?: VoiceSetting,
  scene?: Partial<VoiceSetting>,
): VoiceSetting {
  return {
    voice_id: scene?.voice_id ?? global?.voice_id ?? "Chinese (Mandarin)_Lyrical_Voice",
    speed: scene?.speed ?? global?.speed ?? 1,
    vol: scene?.vol ?? global?.vol ?? 1,
    pitch: scene?.pitch ?? global?.pitch ?? 0,
    ...(scene?.emotion ? { emotion: scene.emotion } : global?.emotion ? { emotion: global.emotion } : {}),
    ...(scene?.language_boost !== undefined
      ? { language_boost: scene.language_boost }
      : global?.language_boost !== undefined
        ? { language_boost: global.language_boost }
        : {}),
  };
}

// ---------------------------------------------------------------------------
// Generate a single scene
// ---------------------------------------------------------------------------

async function generateScene(
  scene: SceneConfig,
  config: VoiceoverConfig,
  apiKey: string,
  outputDir: string,
): Promise<{ file: string; durationMs: number; usageCharacters: number; subtitleFile: string | undefined }> {
  const voiceSetting = mergeVoiceSetting(config.voice_setting, scene.voice_setting);

  const payload: Record<string, unknown> = {
    model: config.model ?? "speech-2.8-turbo",
    text: scene.text,
    stream: config.stream ?? false,
    voice_setting: voiceSetting,
    audio_setting: config.audio_setting ?? { sample_rate: 32000, bitrate: 128000, format: "mp3", channel: 1 },
    output_format: config.output_format ?? "hex",
    subtitle_enable: config.subtitle_enable ?? false,
  };

  log(`Generating: ${scene.id} (${scene.text.slice(0, 30)}...)`);
  const { audioHex, audioLengthMs, audioFormat, usageCharacters, subtitleFile } = await callT2AApi(payload, apiKey);

  const ext = audioFormat === "mp3" ? "mp3" : audioFormat;
  const fileName = `${scene.id}.${ext}`;
  const filePath = join(outputDir, fileName);

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, hexToBuffer(audioHex));

  log(`Saved: ${filePath} (${audioLengthMs}ms, ${usageCharacters} chars)`);
  return { file: `voiceover/${config.composition_id}/${fileName}`, durationMs: audioLengthMs, usageCharacters, subtitleFile };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const configPath = process.argv[2];
  if (!configPath) {
    console.error("Usage: npx tsx scripts/generate-voiceover.ts <config.json>");
    console.error("       MINIMAX_API_KEY=xxx npx tsx scripts/generate-voiceover.ts config.json");
    process.exit(1);
  }

  const envFile = loadEnvFile(process.cwd());
  const apiKey = process.env.MINIMAX_API_KEY ?? envFile.MINIMAX_API_KEY;
  if (!apiKey) {
    console.error("Error: MINIMAX_API_KEY environment variable is required");
    process.exit(1);
  }

  const configRaw = readFileSync(configPath, "utf-8");
  const config: VoiceoverConfig = JSON.parse(configRaw);

  if (!config.composition_id || !config.scenes?.length) {
    console.error("Error: config must have 'composition_id' and non-empty 'scenes'");
    process.exit(1);
  }

  const outputDir = join(process.cwd(), "public", "voiceover", config.composition_id);
  mkdirSync(outputDir, { recursive: true });

  const logDir = join(process.cwd(), "logs");
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, `voiceover-${config.composition_id}-${Date.now()}.log`);
  initLogger(logFile);

  log(`Generating voiceover for: ${config.composition_id}`);
  log(`Output directory: ${outputDir}`);
  log(`Scenes: ${config.scenes.length}`);

  const results: Array<{ id: string; file: string; durationMs: number; usageCharacters: number; subtitleFile: string | undefined }> = [];

  for (const scene of config.scenes) {
    const result = await generateScene(scene, config, apiKey, outputDir);
    results.push({ id: scene.id, ...result });
    // Rate limit guard: 2s between requests
    await new Promise((r) => setTimeout(r, 2000));
  }

  // Fetch and save subtitle files
  for (const r of results) {
    if (r.subtitleFile) {
      try {
        const subRes = await fetch(r.subtitleFile);
        const subtitleData = await subRes.text();
        const subPath = join(outputDir, `${r.id}.subtitle.json`);
        writeFileSync(subPath, subtitleData);
        log(`Subtitle saved: ${subPath}`);
        r.subtitleFile = `voiceover/${config.composition_id}/${r.id}.subtitle.json`;
      } catch (err) {
        logError(`Failed to fetch subtitle for ${r.id}: ${(err as Error).message}`);
      }
    }
  }

  // Write manifest for Remotion to consume
  const manifest = {
    composition_id: config.composition_id,
    generated_at: new Date().toISOString(),
    scenes: results.map((r) => ({
      id: r.id,
      file: r.file,
      durationMs: r.durationMs,
      usageCharacters: r.usageCharacters,
      subtitleFile: r.subtitleFile ?? null,
    })),
  };

  const manifestPath = join(outputDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  log(`Manifest saved: ${manifestPath}`);

  // Usage summary
  const totalChars = results.reduce((sum, r) => sum + r.usageCharacters, 0);
  const totalDurationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const totalDurationS = (totalDurationMs / 1000).toFixed(1);
  log(`--- Usage Summary ---`);
  for (const r of results) {
    log(`  ${r.id}: ${r.usageCharacters} chars, ${(r.durationMs / 1000).toFixed(1)}s`);
  }
  log(`Total: ${totalChars} chars, ${totalDurationS}s audio across ${results.length} scenes`);
  log(`Log file: ${logFile}`);
  log("Done!");
}

main().catch((err) => {
  logError(`Fatal: ${err}`);
  process.exit(1);
});