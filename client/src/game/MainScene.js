import Phaser from 'phaser';

import { EventBus } from './EventBus.js';

export class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // 预加载阶段保留为空，当前背景为运行时绘制
    }

    create() {
        this.cameras.main.setBackgroundColor('#d4c4a8');

        this.backdrop = this.add.graphics({ x: 0, y: 0 }).setDepth(-3);
        this.highlightAurora = this.add.graphics({ x: 0, y: 0 }).setDepth(-2);
        this.starfield = this.add.graphics({ x: 0, y: 0 }).setDepth(-1);
        this.starfield.setBlendMode(Phaser.BlendModes.MULTIPLY);

        this.renderBackdrop();

        this.pulse = this.add.circle(this.scale.width / 2, this.scale.height / 2, 200, 0xff9447, 0.15);
        this.pulse.setBlendMode(Phaser.BlendModes.ADD);
        this.pulse.setVisible(false);

        this.scale.on('resize', this.handleResize, this);
        this.events.once('shutdown', () => {
            this.scale.off('resize', this.handleResize, this);
            EventBus.off('forge:flash', this.handleForgeFlash, this);
        });

        EventBus.emit('current-scene-ready', this);
        EventBus.on('forge:flash', this.handleForgeFlash, this);
    }

    renderBackdrop() {
        const { width, height } = this.scale;

        // 羊皮纸底色渐变
        this.backdrop.clear();
        this.backdrop.fillGradientStyle(0xe8dcc8, 0xd4c4a8, 0xc8b896, 0xdcd0b8, 1, 1, 1, 1);
        this.backdrop.fillRect(0, 0, width, height);

        // 羊皮纸质感：随机污渍和斑点
        this.highlightAurora.clear();
        this.highlightAurora.setBlendMode(Phaser.BlendModes.MULTIPLY);
        
        Phaser.Math.RND.sow([12345]); // 固定种子保证每次渲染相同
        
        // 大面积褪色区域
        const stainCount = 8;
        for (let i = 0; i < stainCount; i += 1) {
            const x = Phaser.Math.FloatBetween(width * 0.1, width * 0.9);
            const y = Phaser.Math.FloatBetween(height * 0.1, height * 0.9);
            const w = Phaser.Math.FloatBetween(width * 0.15, width * 0.35);
            const h = Phaser.Math.FloatBetween(height * 0.15, height * 0.3);
            const color = Phaser.Math.Between(0, 1) === 0 ? 0xb8a687 : 0xa89968;
            const alpha = Phaser.Math.FloatBetween(0.03, 0.08);
            
            this.highlightAurora.fillStyle(color, alpha);
            // 不规则形状
            this.highlightAurora.fillCircle(x, y, Math.max(w, h) * 0.8);
        }

        // 小纹理斑点
        this.starfield.clear();
        this.starfield.fillStyle(0x8b7355, 0.12);
        Phaser.Math.RND.sow([Date.now()]);
        const spotCount = 120;
        for (let i = 0; i < spotCount; i += 1) {
            const x = Phaser.Math.FloatBetween(0, width);
            const y = Phaser.Math.FloatBetween(0, height);
            const radius = Phaser.Math.FloatBetween(0.5, 1.8);
            this.starfield.fillCircle(x, y, radius);
        }
        
        // 纤维纹理线条
        this.starfield.lineStyle(0.3, 0xa89968, 0.15);
        const lineCount = 30;
        for (let i = 0; i < lineCount; i += 1) {
            const x1 = Phaser.Math.FloatBetween(0, width);
            const y1 = Phaser.Math.FloatBetween(0, height);
            const length = Phaser.Math.FloatBetween(10, 40);
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const x2 = x1 + Math.cos(angle) * length;
            const y2 = y1 + Math.sin(angle) * length;
            this.starfield.lineBetween(x1, y1, x2, y2);
        }
    }

    handleResize(gameSize) {
        const { width, height } = gameSize;
        this.cameras.resize(width, height);
        this.renderBackdrop();
        this.pulse.setPosition(width / 2, height / 2);
    }

    handleForgeFlash(payload) {
        const { status } = payload || {};
        if (!this.pulse) {
            return;
        }

        const color = status === 'done' ? 0xffc670 : 0xff9447;
        this.pulse.setFillStyle(color, status === 'done' ? 0.35 : 0.22);
        this.pulse.setVisible(true);
        this.pulse.setAlpha(0.9);
        this.pulse.setScale(0.6);

        this.tweens.killTweensOf(this.pulse);
        this.tweens.add({
            targets: this.pulse,
            alpha: 0,
            scale: 1.5,
            duration: 760,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                this.pulse.setVisible(false);
            },
        });
    }
}

