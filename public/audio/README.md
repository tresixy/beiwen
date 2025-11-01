# 音效资源文件夹

请将音效文件放置在此目录下，支持的格式：`.mp3`, `.ogg`, `.wav`

## 音效列表

### 必需音效

1. **bgm.mp3** - 背景音乐
   - 建议：舒缓的环境音乐，时长3-5分钟，可循环播放
   - 音量：适中，不应过于突出

2. **click.mp3** - 点击音效
   - 建议：轻柔的点击声，持续时间0.1-0.2秒
   - 使用场景：按钮点击、菜单选择

3. **synthesis.mp3** - 合成音效
   - 建议：充满能量感的音效，持续时间0.5-1秒
   - 使用场景：两张卡牌合成时

4. **event_complete.mp3** - 事件通关音效
   - 建议：胜利/成就音效，持续时间1-2秒
   - 使用场景：成功完成一个时代事件

5. **card_drag.mp3** - 卡牌拖动音效
   - 建议：轻微的摩擦或滑动声，持续时间0.2秒
   - 使用场景：拖动卡牌时

6. **card_drop.mp3** - 卡牌放置音效
   - 建议：轻柔的放置声，持续时间0.2-0.3秒
   - 使用场景：卡牌放下或放入熔炉时

7. **hex_click.mp3** - 地图格子点击音效
   - 建议：清脆的点击声，持续时间0.1秒
   - 使用场景：点击六边形地图格子

### 可选音效

8. **card_draw.mp3** - 抽卡音效
   - 使用场景：抽取新卡牌时

9. **turn_end.mp3** - 回合结束音效
   - 使用场景：结束回合时

10. **error.mp3** - 错误音效
    - 使用场景：操作错误或不符合条件时

11. **success.mp3** - 成功音效
    - 使用场景：操作成功时的反馈

## 音效规范

- **格式**: 推荐使用 `.mp3` 格式（兼容性最好）
- **采样率**: 44.1kHz
- **比特率**: 128-192 kbps（背景音乐可用更高比特率）
- **声道**: 立体声（Stereo）
- **音量**: 归一化处理，避免音量过大或过小
- **时长**: 
  - 音效：0.1-2秒
  - 背景音乐：3-10分钟

## 集成方式

音效系统已预留接口，在 `client/src/services/audioService.js` 中实现。

使用示例：
```javascript
import audioService from '@/services/audioService';

// 初始化音效（在应用启动时调用一次）
audioService.init({
    bgm: '/audio/bgm.mp3',
    click: '/audio/click.mp3',
    synthesis: '/audio/synthesis.mp3',
    eventComplete: '/audio/event_complete.mp3',
    cardDrag: '/audio/card_drag.mp3',
    cardDrop: '/audio/card_drop.mp3',
    hexClick: '/audio/hex_click.mp3',
});

// 播放背景音乐
audioService.playBGM();

// 播放音效
audioService.playClick();
audioService.playSynthesis();
audioService.playEventComplete();
```

## 音效来源建议

### 免费资源网站
- [Freesound](https://freesound.org/)
- [OpenGameArt](https://opengameart.org/)
- [Zapsplat](https://www.zapsplat.com/)
- [Mixkit](https://mixkit.co/free-sound-effects/)

### AI生成
- 使用 AI 工具生成自定义音效（如 ElevenLabs、Mubert）

## 注意事项

1. 确保音效文件有适当的版权许可
2. 音效应与游戏的美术风格和氛围相匹配
3. 避免音效过于突兀或刺耳
4. 测试时注意音量平衡，确保各音效之间协调


