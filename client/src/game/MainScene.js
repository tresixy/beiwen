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

        this.backdrop.clear();
        this.backdrop.fillGradientStyle(0xd4c4a8, 0xb8a687, 0xa89968, 0xc8b896, 1, 1, 1, 1);
        this.backdrop.fillRect(0, 0, width, height);

        this.highlightAurora.clear();
        this.highlightAurora.setBlendMode(Phaser.BlendModes.MULTIPLY);
        this.highlightAurora.fillStyle(0x7fb069, 0.1);
        this.highlightAurora.fillEllipse(width * 0.3, height * 0.4, width * 0.5, height * 0.38);
        this.highlightAurora.fillStyle(0xff9447, 0.08);
        this.highlightAurora.fillEllipse(width * 0.7, height * 0.35, width * 0.45, height * 0.32);
        this.highlightAurora.fillStyle(0x6fafe8, 0.09);
        this.highlightAurora.fillEllipse(width * 0.5, height * 0.65, width * 0.55, height * 0.35);

        this.starfield.clear();
        this.starfield.fillStyle(0x2a1810, 0.06);
        Phaser.Math.RND.sow([Date.now()]);
        const starCount = 32;
        for (let i = 0; i < starCount; i += 1) {
            const x = Phaser.Math.FloatBetween(width * 0.08, width * 0.92);
            const y = Phaser.Math.FloatBetween(height * 0.12, height * 0.88);
            const radius = Phaser.Math.FloatBetween(1.2, 2.8);
            this.starfield.fillCircle(x, y, radius);
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

