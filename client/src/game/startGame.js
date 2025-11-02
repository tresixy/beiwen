import Phaser from 'phaser';

import { MainScene } from './MainScene.js';

const createConfig = (parent) => ({
    type: Phaser.AUTO,
    parent,
    backgroundColor: '#0b0d14',
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MainScene],
});

export function startGame(parentId) {
    return new Phaser.Game(createConfig(parentId));
}







