/**
 * 音效服务
 * 为游戏的各种交互预留音效接口
 */

class AudioService {
    constructor() {
        this.sounds = {
            // 背景音乐
            bgm: null,
            // 点击音效
            click: null,
            // 合成音效
            synthesis: null,
            // 事件通关音效
            eventComplete: null,
            // 卡牌拖动/放置音效
            cardDrag: null,
            cardDrop: null,
            // 沙盘格子点击音效
            hexClick: null,
            // 其他音效
            cardDraw: null,
            turnEnd: null,
            error: null,
            success: null,
        };

        this.volume = 0.7; // 默认音量70%
        this.muted = false;
        this.bgmPlaying = false;
    }

    /**
     * 初始化音效
     * @param {Object} soundFiles - 音效文件路径映射
     */
    init(soundFiles = {}) {
        Object.keys(soundFiles).forEach(key => {
            if (this.sounds.hasOwnProperty(key)) {
                const audio = new Audio(soundFiles[key]);
                audio.volume = this.volume;
                this.sounds[key] = audio;
            }
        });
    }

    /**
     * 设置音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        Object.values(this.sounds).forEach(audio => {
            if (audio) {
                audio.volume = this.volume;
            }
        });
    }

    /**
     * 静音/取消静音
     * @param {boolean} muted - 是否静音
     */
    setMuted(muted) {
        this.muted = muted;
        if (this.sounds.bgm) {
            this.sounds.bgm.muted = muted;
        }
    }

    /**
     * 播放音效
     * @param {string} soundName - 音效名称
     */
    play(soundName) {
        if (this.muted) return;
        
        const sound = this.sounds[soundName];
        if (sound) {
            // 重置音效到开始位置以支持快速连续播放
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.warn(`播放音效失败: ${soundName}`, err);
            });
        }
    }

    /**
     * 播放背景音乐
     * @param {boolean} loop - 是否循环播放
     */
    playBGM(loop = true) {
        if (this.muted || !this.sounds.bgm) return;
        
        this.sounds.bgm.loop = loop;
        this.sounds.bgm.play().then(() => {
            this.bgmPlaying = true;
        }).catch(err => {
            console.warn('播放背景音乐失败', err);
        });
    }

    /**
     * 停止背景音乐
     */
    stopBGM() {
        if (this.sounds.bgm) {
            this.sounds.bgm.pause();
            this.sounds.bgm.currentTime = 0;
            this.bgmPlaying = false;
        }
    }

    /**
     * 暂停背景音乐
     */
    pauseBGM() {
        if (this.sounds.bgm) {
            this.sounds.bgm.pause();
            this.bgmPlaying = false;
        }
    }

    /**
     * 恢复背景音乐
     */
    resumeBGM() {
        if (this.sounds.bgm && !this.bgmPlaying) {
            this.sounds.bgm.play().then(() => {
                this.bgmPlaying = true;
            }).catch(err => {
                console.warn('恢复背景音乐失败', err);
            });
        }
    }

    // === 便捷方法 ===

    /**
     * 播放点击音效
     */
    playClick() {
        this.play('click');
    }

    /**
     * 播放合成音效
     */
    playSynthesis() {
        this.play('synthesis');
    }

    /**
     * 播放事件完成音效
     */
    playEventComplete() {
        this.play('eventComplete');
    }

    /**
     * 播放卡牌拖动音效
     */
    playCardDrag() {
        this.play('cardDrag');
    }

    /**
     * 播放卡牌放置音效
     */
    playCardDrop() {
        this.play('cardDrop');
    }

    /**
     * 播放地图格子点击音效
     */
    playHexClick() {
        this.play('hexClick');
    }

    /**
     * 播放卡牌抽取音效
     */
    playCardDraw() {
        this.play('cardDraw');
    }

    /**
     * 播放回合结束音效
     */
    playTurnEnd() {
        this.play('turnEnd');
    }

    /**
     * 播放错误音效
     */
    playError() {
        this.play('error');
    }

    /**
     * 播放成功音效
     */
    playSuccess() {
        this.play('success');
    }
}

// 创建单例
const audioService = new AudioService();

export default audioService;

