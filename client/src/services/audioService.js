/**
 * 音效服务
 * 为游戏的各种交互预留音效接口
 */

class AudioService {
    constructor() {
        this.sounds = {
            // 点击音效
            click: null,
            clickVariants: [], // 点击音效变体
            // 合成音效
            synthesis: null,
            synthesisVariants: [], // 合成音效变体
            keySynthesis: null, // 钥匙卡合成音效
            // 事件通关音效
            eventComplete: null,
            // 时代音效
            eraTransition: null,
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
            enterGame: null, // 进入游戏音效
        };

        // 时代背景音乐映射
        this.bgmMap = {
            '生存时代': null,
            '城邦时代': null,
            '分野时代': null,
            '帝国时代': null,
            '理性时代': null,
            '信仰时代': null,
            '启蒙时代': null,
            '全球时代': null,
            '第二次分野时代': null,
            '星辰时代': null,
            '奇点时代': null,
        };

        this.currentBgm = null;
        this.currentEra = null;
        this.volume = 0.7; // 默认音量70%
        this.muted = false;
        this.bgmPlaying = false;
    }

    /**
     * 初始化音效
     * @param {Object} config - 音效配置
     * @param {Object} config.sounds - 音效文件路径映射
     * @param {Object} config.bgm - 时代BGM文件路径映射
     */
    init(config = {}) {
        const { sounds = {}, bgm = {} } = config;
        
        // 初始化普通音效
        Object.keys(sounds).forEach(key => {
            if (key === 'clickVariants' || key === 'synthesisVariants') {
                // 处理音效变体数组
                if (Array.isArray(sounds[key])) {
                    this.sounds[key] = sounds[key].map(path => {
                        const audio = new Audio(path);
                        audio.volume = this.volume;
                        return audio;
                    });
                }
            } else if (this.sounds.hasOwnProperty(key)) {
                const audio = new Audio(sounds[key]);
                audio.volume = this.volume;
                this.sounds[key] = audio;
            }
        });

        // 初始化时代BGM
        Object.keys(bgm).forEach(era => {
            if (this.bgmMap.hasOwnProperty(era)) {
                const audio = new Audio(bgm[era]);
                audio.volume = this.volume * 0.5; // BGM音量降低50%
                audio.loop = true;
                this.bgmMap[era] = audio;
            }
        });
    }

    /**
     * 设置音量
     * @param {number} volume - 音量 (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        
        // 更新普通音效音量
        Object.entries(this.sounds).forEach(([key, audio]) => {
            if (Array.isArray(audio)) {
                audio.forEach(a => a.volume = this.volume);
            } else if (audio) {
                audio.volume = this.volume;
            }
        });

        // 更新BGM音量（降低50%）
        Object.values(this.bgmMap).forEach(audio => {
            if (audio) {
                audio.volume = this.volume * 0.5;
            }
        });

        // 更新当前播放的BGM
        if (this.currentBgm) {
            this.currentBgm.volume = this.volume * 0.5;
        }
    }

    /**
     * 静音/取消静音
     * @param {boolean} muted - 是否静音
     */
    setMuted(muted) {
        this.muted = muted;
        if (this.currentBgm) {
            this.currentBgm.muted = muted;
        }
    }

    /**
     * 播放音效
     * @param {string} soundName - 音效名称
     * @param {boolean} useVariant - 是否使用变体（随机选择）
     */
    play(soundName, useVariant = false) {
        if (this.muted) return;
        
        let sound = this.sounds[soundName];
        
        // 如果启用变体且存在变体数组
        if (useVariant) {
            const variantKey = soundName + 'Variants';
            const variants = this.sounds[variantKey];
            if (Array.isArray(variants) && variants.length > 0) {
                sound = variants[Math.floor(Math.random() * variants.length)];
            }
        }
        
        if (sound) {
            // 重置音效到开始位置以支持快速连续播放
            sound.currentTime = 0;
            sound.play().catch(err => {
                console.warn(`播放音效失败: ${soundName}`, err);
            });
        }
    }

    /**
     * 切换到指定时代的背景音乐
     * @param {string} era - 时代名称
     */
    switchBGM(era) {
        if (this.currentEra === era) return; // 已经在播放该时代BGM
        
        const newBgm = this.bgmMap[era];
        if (!newBgm) {
            console.warn(`未找到时代 ${era} 的BGM`);
            return;
        }

        // 淡出当前BGM
        if (this.currentBgm && this.bgmPlaying) {
            this.fadeOut(this.currentBgm, 1000, () => {
                this.currentBgm.pause();
                this.currentBgm.currentTime = 0;
            });
        }

        // 淡入新BGM
        this.currentBgm = newBgm;
        this.currentEra = era;
        
        if (!this.muted) {
            newBgm.volume = 0;
            newBgm.play().then(() => {
                this.bgmPlaying = true;
                this.fadeIn(newBgm, 1500, this.volume * 0.5);
            }).catch(err => {
                console.warn(`播放时代 ${era} 的BGM失败`, err);
            });
        }
    }

    /**
     * 淡入效果
     */
    fadeIn(audio, duration, targetVolume) {
        const steps = 20;
        const stepTime = duration / steps;
        const volumeStep = targetVolume / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            audio.volume = Math.min(volumeStep * currentStep, targetVolume);
            
            if (currentStep >= steps) {
                clearInterval(interval);
            }
        }, stepTime);
    }

    /**
     * 淡出效果
     */
    fadeOut(audio, duration, callback) {
        const steps = 20;
        const stepTime = duration / steps;
        const startVolume = audio.volume;
        const volumeStep = startVolume / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            audio.volume = Math.max(startVolume - volumeStep * currentStep, 0);
            
            if (currentStep >= steps) {
                clearInterval(interval);
                if (callback) callback();
            }
        }, stepTime);
    }

    /**
     * 停止背景音乐
     */
    stopBGM() {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.currentBgm.currentTime = 0;
            this.bgmPlaying = false;
        }
    }

    /**
     * 暂停背景音乐
     */
    pauseBGM() {
        if (this.currentBgm) {
            this.currentBgm.pause();
            this.bgmPlaying = false;
        }
    }

    /**
     * 恢复背景音乐
     */
    resumeBGM() {
        if (this.currentBgm && !this.bgmPlaying && !this.muted) {
            this.currentBgm.play().then(() => {
                this.bgmPlaying = true;
            }).catch(err => {
                console.warn('恢复背景音乐失败', err);
            });
        }
    }

    // === 便捷方法 ===

    /**
     * 播放点击音效（随机变体）
     */
    playClick() {
        this.play('click', true);
    }

    /**
     * 播放合成音效（随机变体）
     * @param {boolean} isKeyCard - 是否为钥匙卡合成
     */
    playSynthesis(isKeyCard = false) {
        if (isKeyCard && this.sounds.keySynthesis) {
            this.play('keySynthesis');
        } else {
            this.play('synthesis', true);
        }
    }

    /**
     * 播放事件完成音效
     */
    playEventComplete() {
        this.play('eventComplete');
    }

    /**
     * 播放时代切换音效
     */
    playEraTransition() {
        this.play('eraTransition');
    }

    /**
     * 播放进入游戏音效
     */
    playEnterGame() {
        this.play('enterGame');
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



