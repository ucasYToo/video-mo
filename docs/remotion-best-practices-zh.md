---
name: remotion-best-practices
description: Remotion 最佳实践 —— 使用 React 创建视频
metadata:
  tags: remotion, video, react, animation, composition
---

## 何时使用

当你在处理 Remotion 代码时，使用本技能获取领域特定知识。

## 新项目搭建

在空文件夹或工作区中，如果没有现成的 Remotion 项目，使用以下命令脚手架初始化：

```bash
npx create-video@latest --yes --blank --no-tailwind my-video
```

将 `my-video` 替换为合适的项目名称。

## 启动预览

启动 Remotion Studio 预览视频：

```bash
npx remotion studio
```

## 可选：单帧渲染检查

你可以使用 CLI 渲染单帧来快速检查布局、颜色或时机。
对于微小编辑、纯重构，或当你已通过 Studio 或之前的渲染有足够信心时，可以跳过此步骤。

```bash
npx remotion still [composition-id] --scale=0.25 --frame=30
```

在 30 fps 下，`--frame=30` 表示第 1 秒的位置（`--frame` 是从 0 开始计数的）。

## 字幕

处理字幕或标题时，阅读 [./rules/subtitles.md](./rules/subtitles.md) 文件获取更多信息。

## 使用 FFmpeg

对于某些视频操作，如裁剪视频或检测静音，应使用 FFmpeg。阅读 [./rules/ffmpeg.md](./rules/ffmpeg.md) 文件获取更多信息。

## 静音检测

当需要检测并裁剪视频或音频文件中的静音片段时，阅读 [./rules/silence-detection.md](./rules/silence-detection.md) 文件。

## 音频可视化

当需要将音频可视化（频谱条、波形、低音响应效果）时，阅读 [./rules/audio-visualization.md](./rules/audio-visualization.md) 文件获取更多信息。

## 音效

当需要使用音效时，阅读 [./rules/sfx.md](./rules/sfx.md) 文件获取更多信息。

## 使用方法

阅读各个规则文件以获取详细说明和代码示例：

- [rules/3d.md](rules/3d.md) —— 在 Remotion 中使用 Three.js 和 React Three Fiber 创建 3D 内容
- [rules/animations.md](rules/animations.md) —— Remotion 的基础动画技能
- [rules/assets.md](rules/assets.md) —— 在 Remotion 中导入图片、视频、音频和字体
- [rules/audio.md](rules/audio.md) —— 在 Remotion 中使用音频和声音：导入、裁剪、音量、速度、音调
- [rules/calculate-metadata.md](rules/calculate-metadata.md) —— 动态设置合成（composition）时长、尺寸和 props
- [rules/can-decode.md](rules/can-decode.md) —— 使用 Mediabunny 检查浏览器是否能解码某个视频
- [rules/charts.md](rules/charts.md) —— Remotion 的图表和数据可视化模式（柱状图、饼图、折线图、股票图）
- [rules/compositions.md](rules/compositions.md) —— 定义合成、静帧、文件夹、默认 props 和动态元数据
- [rules/extract-frames.md](rules/extract-frames.md) —— 使用 Mediabunny 在特定时间戳提取视频帧
- [rules/fonts.md](rules/fonts.md) —— 在 Remotion 中加载 Google Fonts 和本地字体
- [rules/get-audio-duration.md](rules/get-audio-duration.md) —— 使用 Mediabunny 获取音频文件的时长（秒）
- [rules/get-video-dimensions.md](rules/get-video-dimensions.md) —— 使用 Mediabunny 获取视频文件的宽度和高度
- [rules/get-video-duration.md](rules/get-video-duration.md) —— 使用 Mediabunny 获取视频文件的时长（秒）
- [rules/gifs.md](rules/gifs.md) —— 在 Remotion 时间轴上同步播放 GIF
- [rules/images.md](rules/images.md) —— 使用 Img 组件在 Remotion 中嵌入图片
- [rules/light-leaks.md](rules/light-leaks.md) —— 使用 @remotion/light-leaks 实现漏光叠加效果
- [rules/lottie.md](rules/lottie.md) —— 在 Remotion 中嵌入 Lottie 动画
- [rules/measuring-dom-nodes.md](rules/measuring-dom-nodes.md) —— 在 Remotion 中测量 DOM 元素尺寸
- [rules/measuring-text.md](rules/measuring-text.md) —— 测量文本尺寸、将文本适配容器、检查溢出
- [rules/sequencing.md](rules/sequencing.md) —— Remotion 的序列模式：延迟、裁剪、限制元素时长
- [rules/tailwind.md](rules/tailwind.md) —— 在 Remotion 中使用 TailwindCSS
- [rules/text-animations.md](rules/text-animations.md) —— Remotion 的排版和文本动画模式
- [rules/timing.md](rules/timing.md) —— 使用 interpolate 和贝塞尔缓动、弹簧动画控制时机
- [rules/transitions.md](rules/transitions.md) —— Remotion 的场景转场模式
- [rules/transparent-videos.md](rules/transparent-videos.md) —— 渲染带透明通道的视频
- [rules/trimming.md](rules/trimming.md) —— Remotion 的裁剪模式：剪切动画的开头或结尾
- [rules/videos.md](rules/videos.md) —— 在 Remotion 中嵌入视频：裁剪、音量、速度、循环、音调
- [rules/parameters.md](rules/parameters.md) —— 通过添加 Zod 模式使视频可参数化
- [rules/maps.md](rules/maps.md) —— 使用 Mapbox 添加地图并制作动画
- [rules/silence-detection.md](rules/silence-detection.md) —— 使用 FFmpeg loudnorm 和 silencedetect 进行自适应静音检测
- [rules/voiceover.md](rules/voiceover.md) —— 使用 ElevenLabs TTS 为 Remotion 合成添加 AI 生成的旁白
