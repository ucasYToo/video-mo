# CLAUDE.md

## 短片创作

使用 `create-short-film` skill 创建新的短片视频项目。

核心文件：
- 故事配置类型：`src/types/story.ts`
- 通用组件：`src/compositions/ShortFilmComposition.tsx`
- 配音配置生成：`scripts/generate-voiceover-config.ts`
- 配音生成：`scripts/generate-voiceover.ts`
- 音轨合并：`scripts/merge-voiceover.ts`

工作流：story.json → generate-voiceover-config → generate-voiceover → merge-voiceover → preview/render

## 配音生成

生成配音时优先使用 MiniMax TTS 方案，不要使用 ElevenLabs。

模型默认使用：speech-2.8-turbo

- 脚本: `scripts/generate-voiceover.ts`
- 文档: `docs/minimax-voiceover.md`
- 环境变量: `MINIMAX_API_KEY`

用法:
```bash
MINIMAX_API_KEY=xxx npx tsx scripts/generate-voiceover.ts <config.json>
```