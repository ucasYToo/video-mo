import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, unlinkSync, readdirSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const FPS = 30;
const MANIFEST_PATH = "public/voiceover/ShortFilm/manifest.json";
const AUDIO_DIR = "public/voiceover/ShortFilm";
const OUTPUT_PATH = "public/voiceover/ShortFilm/voiceover.mp3";

// Line startFrames from ShortFilm.tsx LINES array
const LINE_START_FRAMES = [
  60, 80, 100, 125, 140, 180, 200, 250,
  260, 310, 335, 350, 375, 395, 410, 470, 550,
  620, 645, 705, 740, 890, 920, 1010, 1055,
  1130, 1220, 1250,
];

interface ManifestScene {
  id: string;
  file: string;
  durationMs: number;
}

const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as {
  scenes: ManifestScene[];
};

if (manifest.scenes.length !== LINE_START_FRAMES.length) {
  console.error(
    `Mismatch: manifest has ${manifest.scenes.length} scenes, but LINES has ${LINE_START_FRAMES.length} entries`,
  );
  process.exit(1);
}

// Build padded clips: for each scene, prepend silence so it starts at the right time
// Then overlay all clips on a single long silent track
const totalDurationMs = Math.round(
  (LINE_START_FRAMES[LINE_START_FRAMES.length - 1] / FPS) * 1000
    + manifest.scenes[manifest.scenes.length - 1].durationMs
    + 2000,
);

const tmpDir = join(AUDIO_DIR, "_tmp");
mkdirSync(tmpDir, { recursive: true });

console.log(`Creating base silence track (${totalDurationMs}ms)...`);

// Create a long silent base track
execSync(
  `ffmpeg -y -f lavfi -i anullsrc=r=32000:cl=mono -t ${totalDurationMs / 1000} -b:a 128k "${join(tmpDir, "base.mp3")}"`,
  { stdio: "pipe" },
);

// For each scene, create a padded clip with silence before it
const filterInputs = [`[0:a]`]; // base silence
const filterChain: string[] = [];

for (let i = 0; i < manifest.scenes.length; i++) {
  const scene = manifest.scenes[i];
  const audioPath = join("public", scene.file);
  const delayMs = Math.round((LINE_START_FRAMES[i] / FPS) * 1000);
  const paddedPath = join(tmpDir, `delayed-${String(i).padStart(2, "0")}.mp3`);

  // Create a clip with silence prepended
  execSync(
    `ffmpeg -y -f lavfi -i anullsrc=r=32000:cl=mono -i "${audioPath}" `
      + `-filter_complex "[0:a]atrim=0:${delayMs / 1000}[silence];[silence][1:a]concat=n=2:v=0:a=1[out]" `
      + `-map "[out]" -b:a 128k -ar 32000 "${paddedPath}"`,
    { stdio: "pipe" },
  );

  filterInputs.push(`[${i + 1}:a]`);
}

// Build amix command: base + all delayed clips
const inputArgs = [`-i "${join(tmpDir, "base.mp3")}"`];
for (let i = 0; i < manifest.scenes.length; i++) {
  inputArgs.push(`-i "${join(tmpDir, `delayed-${String(i).padStart(2, "0")}.mp3`)}"`);
}

const mixFilter =
  `${filterInputs.join("")}amix=inputs=${manifest.scenes.length + 1}:duration=first:dropout_transition=0[out]`;

console.log("Mixing all tracks...");

execSync(
  `ffmpeg -y ${inputArgs.join(" ")} -filter_complex "${mixFilter}" -map "[out]" -b:a 128k -ar 32000 "${OUTPUT_PATH}"`,
  { stdio: "inherit", shell: "/bin/bash" },
);

// Cleanup
readdirSync(tmpDir).forEach((f) => unlinkSync(join(tmpDir, f)));
execSync(`rmdir "${tmpDir}"`);

console.log(`\nMerged audio saved: ${OUTPUT_PATH}`);