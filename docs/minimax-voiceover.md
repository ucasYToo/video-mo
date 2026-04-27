# MiniMax 语音合成配音方案

## 短片工作流

对于短片项目，使用 `scripts/generate-voiceover-config.ts` 从 story.json 自动生成配音配置：

```bash
# 1. 从故事配置生成 voiceover.json
npx tsx scripts/generate-voiceover-config.ts src/stories/<storyId>/story.json

# 2. 生成配音音频
MINIMAX_API_KEY=xxx npx tsx scripts/generate-voiceover.ts src/stories/<storyId>/voiceover.json

# 3. 合并音轨 + 生成 timeline
npx tsx scripts/merge-voiceover.ts src/stories/<storyId>/story.json
```

详细说明见 `.claude/skills/create-short-film/SKILL.md`。

## 概述

使用 MiniMax T2A (Text-to-Audio) API 为 Remotion 视频生成配音，脚本位于 `scripts/generate-voiceover.ts`。

## 前置条件

1. **MiniMax API Key** — 在 [接口密钥](https://platform.minimaxi.com/user-center/basic-information/interface-key) 获取
2. **tsx** — 用于运行 TypeScript 脚本（`npm install -g tsx` 或 `npx tsx`）

## 快速开始

```bash
# 1. 设置 API Key
export MINIMAX_API_KEY="your-api-key"

# 2. 准备配置文件（参考 scripts/voiceover.example.json）

# 3. 运行生成脚本
npx tsx scripts/generate-voiceover.ts scripts/voiceover.example.json
```

生成的音频文件和 `manifest.json` 会输出到 `public/voiceover/<composition_id>/` 目录。

## 配置文件格式

```jsonc
{
  "composition_id": "my-video",       // 必填，composition 标识，也是输出子目录名
  "model": "speech-2.8-hd",           // 可选，默认 speech-2.8-hd
  "stream": false,                    // 可选，默认 false（非流式）
  "voice_setting": {                  // 全局音色设置，scene 可覆盖
    "voice_id": "Chinese (Mandarin)_Lyrical_Voice",
    "speed": 1,                       // [0.5, 2]
    "vol": 1,                         // (0, 10]
    "pitch": 0,                       // [-12, 12]
    "emotion": "calm",               // happy/sad/angry/fearful/disgusted/surprised/calm/fluent/whisper
    "language_boost": "auto"         // 小语种/方言增强
  },
  "audio_setting": {                  // 音频参数
    "sample_rate": 32000,             // [8000,16000,22050,24000,32000,44100]
    "bitrate": 128000,                // [32000,64000,128000,256000]
    "format": "mp3",                  // mp3/pcm/flac/wav
    "channel": 1                      // 1=单声道, 2=双声道
  },
  "output_format": "hex",            // hex 或 url（非流式可用 url，24h 有效）
  "subtitle_enable": false,           // 是否生成字幕
  "scenes": [
    {
      "id": "scene-01-intro",         // 场景标识，用于文件命名
      "text": "欢迎观看本期视频",      // 合成文本，<10000 字符
      "voice_setting": {              // 可选，覆盖全局设置
        "emotion": "happy"
      }
    }
  ]
}
```

## 输出结构

```
public/voiceover/<composition_id>/
├── scene-01-intro.mp3
├── scene-02-main.mp3
├── scene-03-outro.mp3
└── manifest.json
```

### manifest.json 格式

```json
{
  "composition_id": "my-video",
  "generated_at": "2026-04-27T10:00:00.000Z",
  "scenes": [
    { "id": "scene-01-intro", "file": "voiceover/my-video/scene-01-intro.mp3", "durationMs": 1500 },
    { "id": "scene-02-main", "file": "voiceover/my-video/scene-02-main.mp3", "durationMs": 3200 }
  ]
}
```

## 文本特殊控制

### 停顿

用 `<#x#>` 插入停顿，x 为秒数（0.01-99.99）：

```
今天我们聊一聊<#0.5#>人工智能的发展
```

### 语气词标签（仅 speech-2.8 模型）

```
真的吗(laughs)    // 笑声
哎呀(sighs)       // 叹气
嗯(emm)           // 嗯
```

支持：`(laughs)` `(chuckle)` `(coughs)` `(sighs)` `(breath)` `(pant)` `(inhale)` `(exhale)` `(gasps)` `(sniffs)` `(groans)` `(humming)` `(hissing)` `(emm)` `(sneezes)` `(snorts)` `(burps)` `(lip-smacking)` `(clear-throat)`

### 发音纠正

不直接在配置文件中支持，如需添加请修改脚本中的 `pronunciation_dict` 参数。

## 在 Remotion 中使用

```tsx
import { Audio } from "@remotion/media";
import { Sequence, staticFile } from "remotion";

// 读取 manifest 获取各场景时长
const manifest = require("../../public/voiceover/my-video/manifest.json");

export const MyComposition = () => {
  const { fps } = useVideoConfig();

  return (
    <>
      <Sequence from={0}>
        <Audio src={staticFile("voiceover/my-video/scene-01-intro.mp3")} />
      </Sequence>
      <Sequence from={manifest.scenes[0].durationMs / 1000 * fps}>
        <Audio src={staticFile("voiceover/my-video/scene-02-main.mp3")} />
      </Sequence>
    </>
  );
};
```

## 可用模型

| 模型 | 说明 |
|------|------|
| `speech-2.8-hd` | 最高质量，支持语气词标签（推荐） |
| `speech-2.8-turbo` | 更快速度，较小延迟 |
| `speech-2.6-hd` | 上一代高质量 |
| `speech-2.6-turbo` | 上一代快速 |

## 常见中文音色

| voice_id | 描述 |
|----------|------|
| `Chinese (Mandarin)_Lyrical_Voice` | 抒情女声 |
| `Chinese (Mandarin)_HK_Flight_Attendant` | 港式空乘 |
| `moss_audio_ce44fc67-7ce3-11f0-8de5-96e35d26fb85` | Moss 音色 |
| `moss_audio_aaa1346a-7ce7-11f0-8e61-2e6e3c7ee85d` | Moss 音色 |

完整音色列表见 [系统音色列表](https://platform.minimaxi.com/faq/system-voice-id) 或使用 [查询可用音色 API](https://platform.minimaxi.com/api-reference/voice-management-get)。

## API 端点

脚本自动尝试以下端点（主站优先，失败自动切换备用）：

- 主站: `https://api.minimaxi.com/v1/t2a_v2`
- 备用: `https://api-bj.minimaxi.com/v1/t2a_v2`