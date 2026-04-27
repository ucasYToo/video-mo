---
name: create-short-film
description: Create a new short film video project using the typewriter film template
---

# 创建短片项目

## 何时使用

当需要创建一个新的短片视频项目时使用此 skill。涵盖从编写故事配置到渲染最终视频的完整工作流。

## 概述

短片系统是配置驱动的。一个 `story.json` 文件定义所有故事内容、视觉风格和情感结构。脚本从配置生成配音音频和 timeline 数据，通用组件从配置 + timeline 渲染视频。

## 工作流

### 第 1 步：创建 story.json

在新目录 `src/stories/<StoryId>/` 下创建 `story.json`。

```bash
mkdir -p src/stories/MyStory
```

#### 完整字段说明

```jsonc
{
  "storyId": "MyStory",           // PascalCase，用于 composition ID、文件路径
  "fps": 30,                      // 帧率
  "title": {
    "lines": ["标题", "副标题"],     // lines[0] 为小字副标题，lines[1+] 为大字主标题
    "image": "my-art.png"           // 可选，public/ 下的图片文件名
  },
  "timing": {
    "titleDuration": 60,           // 标题画面持续帧数
    "fadeDuration": 4,             // 每行淡入帧数
    "bufferFrames": 90,            // 结尾缓冲帧数
    "typewriterSpeed": 1,          // 打字速度（帧/字）
    "interLineGapMs": 300,        // 普通行间停顿（毫秒）
    "emphasisGapMs": 2000          // 强调行间停顿（毫秒）
  },
  "style": {
    "lineHeights": {               // 每种的行高（像素）
      "normal": 78,
      "dialog": 65,
      "emphasis": 157
    },
    "defaultBgColor": "#0a0a0a",   // 初始背景色
    "variantClasses": {            // 每种文本的 Tailwind 类
      "normal": "text-[48px] font-normal text-gray-200 font-serif",
      "dialog": "text-[40px] font-normal text-gray-300 font-serif tracking-wide",
      "emphasis": "text-[72px] font-bold font-serif tracking-wider mt-4 mb-6"
    }
  },
  "speakers": [
    {
      "id": "M",                   // 说话人标识，lines[] 中引用
      "name": "male",              // 对应音频文件名 male.mp3
      "voiceId": "Chinese (Mandarin)_Unrestrained_Young_Man",
      "speed": 1.8                 // 可选，覆盖全局速度
    }
  ],
  "lines": [
    // 普通叙述
    { "speaker": "M", "text": "这是一行叙述。", "variant": "normal" },
    // 对话
    { "speaker": "F", "text": "「这是对话。」", "variant": "dialog" },
    // 强调（带视觉效果）
    {
      "speaker": "M",
      "text": "关键台词。",
      "variant": "emphasis",
      "emphasisColor": "#4ecdc4",   // 可选，强调色，默认 #ffffff
      "shakeIntensity": 1.5,        // 可选，震动强度，默认 3
      "beat": "discovery"           // 可选，链接到 beats[]
    }
  ],
  "beats": [
    // 情感节拍定义：驱动背景色过渡和心跳效果
    { "tag": "romance", "bgColor": "#1a1410", "heartbeat": false },
    { "tag": "discovery", "bgColor": "#0a1a18", "heartbeat": true },
    { "tag": "conflict", "bgColor": "#1a0808", "heartbeat": true },
    { "tag": "resolution", "bgColor": "#1a1512", "heartbeat": false },
    { "tag": "ending", "bgColor": "#0a0a0f", "heartbeat": false }
  ],
  "bgColorEnd": "#020202",          // 最终背景色
  "heartbeatStartBeat": "romance"   // 哪个 beat tag 触发心跳效果
}
```

#### 编写 lines[] 要点

- `speaker` 必须匹配 speakers[] 中的 id
- `variant`：`"normal"`（叙述）、`"dialog"`（引语）、`"emphasis"`（戏剧揭示）
- `beat` 字段将行链接到情感节拍。每个 tag 的**第一行**成为颜色过渡点，**所有**有 beat 的行都是心跳增强点
- `pauseAfterMs` 可覆盖默认间距（用于微调节奏）

#### 编写 beats[] 要点

- 每个节拍定义一个背景色和是否激活心跳
- 节拍按 lines[] 中首次出现的顺序驱动颜色过渡
- `heartbeatStartBeat` 决定心跳效果从哪个节拍开始

### 第 2 步：生成配音配置

```bash
npx tsx scripts/generate-voiceover-config.ts src/stories/MyStory/story.json
```

输出：`src/stories/MyStory/voiceover.json`

此脚本将 lines[] 按说话人分组，用停顿标记串联文本，自动生成 MiniMax TTS 所需的配置。

### 第 3 步：生成配音音频

```bash
MINIMAX_API_KEY=xxx npx tsx scripts/generate-voiceover.ts src/stories/MyStory/voiceover.json
```

输出：`public/voiceover/MyStory-wip/` 目录下的 MP3 和字幕文件。

如需查看可用音色，见 `docs/minimax-voiceover.md`。

### 第 4 步：合并音轨

```bash
npx tsx scripts/merge-voiceover.ts src/stories/MyStory/story.json
```

输出：
- `public/voiceover/MyStory/voiceover.mp3` — 合并后的单音轨
- `public/voiceover/MyStory/timeline.json` — 带帧级时间码的增强 timeline

### 第 5 步：添加素材

将自定义图片（标题美术等）放到 `public/` 目录，在 `story.json` 的 `title.image` 中引用。

### 第 6 步：注册到 Root.tsx

```tsx
import myStory from "./stories/MyStory/story.json";
import myTimeline from "../../public/voiceover/MyStory/timeline.json";

const STORIES = [
  // ... 已有项目
  { config: myStory as StoryConfig, timeline: myTimeline as TimelineData },
];
```

### 第 7 步：预览和渲染

```bash
# 预览
npx remotion studio

# 渲染
npx remotion render MyStory out/MyStory.mp4

# 生成封面
npx remotion still MyStory-Cover

# 嵌入封面到 MP4
ffmpeg -i out/MyStory.mp4 -i out/MyStory-Cover.png -map 0 -map 1 -c copy -disposition:v:1 attached_pic out/MyStory-with-cover.mp4
```

## 参考文件

| 文件 | 说明 |
|------|------|
| `src/types/story.ts` | StoryConfig 类型定义 |
| `src/types/timeline.ts` | TimelineData 类型定义 |
| `src/compositions/ShortFilmComposition.tsx` | 通用短片组件 |
| `src/components/StoryCover.tsx` | 通用封面组件 |
| `src/components/TitleCard.tsx` | 标题卡片组件 |
| `scripts/generate-voiceover-config.ts` | 配音配置生成器 |
| `scripts/generate-voiceover.ts` | MiniMax TTS 脚本 |
| `scripts/merge-voiceover.ts` | 音轨合并 + timeline 生成 |

## 自定义视觉风格

默认 `ShortFilmComposition` 渲染暗色打字机风格。如需完全不同的视觉风格，创建新的 composition 组件，接收相同的 `{ config, timeline }` props，在 Root.tsx 中注册。

## 故障排除

- **合并时 "Missing subtitle" 错误：** 配音音频可能未完整生成，重新运行配音生成脚本
- **Studio 中看不到 Composition：** 检查 timeline.json 是否存在、Root.tsx 的 STORIES 数组是否包含该项目
- **合并后时间不对：** 调整 story.json 中的 `pauseAfterMs` 值，重新运行合并脚本