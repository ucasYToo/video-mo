# CLAUDE.md

## 配音生成

生成配音时优先使用 MiniMax TTS 方案，不要使用 ElevenLabs。

模型默认使用：speech-2.8-turbo

- 脚本: `scripts/generate-voiceover.ts`
- 文档: `docs/minimax-voiceover.md`
- 示例配置: `scripts/voiceover.example.json`
- 输出目录: `public/voiceover/<composition_id>/`
- 环境变量: `MINIMAX_API_KEY`

用法:
```bash
MINIMAX_API_KEY=xxx npx tsx scripts/generate-voiceover.ts <config.json>
```