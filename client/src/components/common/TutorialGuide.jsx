import { useEffect, useState, useCallback } from 'react';
import './TutorialGuide.css';

// 五幕引导内容
const TUTORIAL_ACTS = [
    {
        id: 'act1',
        title: '世界诞生',
        texts: [
            '起初，什么都没有。',
            '然后……有人想太多了。',
            '于是，世界被加载了。'
        ],
        theme: 'void',
        particles: true
    },
    {
        id: 'act2',
        title: '造物原理',
        texts: [
            '世界由概念组成。',
            '拖拽两个名词，看看会不会出动词。',
            '如果炸了，那也是一种进步。'
        ],
        theme: 'forge',
        showCards: true
    },
    {
        id: 'act3',
        title: '你的角色',
        texts: [
            '你不是神，你只是个喜欢乱拼卡的人。',
            '但没关系，文明也是这么来的。',
            '试着解开第一个困境：寒冷。'
        ],
        theme: 'player',
        showAvatar: true
    },
    {
        id: 'act4',
        title: '规则速递',
        texts: [
            '两张卡进熔炉，一张卡出来。',
            'A+B=C 它可能是傲慢，也可能是贪婪'
        ],
        theme: 'rules',
        showForge: true
    },
    {
        id: 'act5',
        title: '任务说明',
        texts: [
            '解决困境，点亮文明。',
            '准备好了吗？',
            '灵感加载完毕。',
            '现在——去制造火吧。'
        ],
        theme: 'start',
        showProgress: true,
        isFinal: true
    }
];

export function TutorialGuide({ onClose }) {
    const [currentAct, setCurrentAct] = useState(0);
    const [textIndex, setTextIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    // 显示动画
    useEffect(() => {
        setTimeout(() => setIsVisible(true), 50);
    }, []);

    // 自动播放文字
    useEffect(() => {
        const act = TUTORIAL_ACTS[currentAct];
        if (!act) return;

        if (textIndex < act.texts.length) {
            const timer = setTimeout(() => {
                setTextIndex(textIndex + 1);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [currentAct, textIndex]);

    const handleNext = useCallback(() => {
        if (currentAct < TUTORIAL_ACTS.length - 1) {
            setCurrentAct(currentAct + 1);
            setTextIndex(0);
        } else {
            handleClose();
        }
    }, [currentAct]);

    const handlePrevious = useCallback(() => {
        if (currentAct > 0) {
            setCurrentAct(currentAct - 1);
            setTextIndex(0);
        }
    }, [currentAct]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            onClose?.();
        }, 300);
    }, [onClose]);

    const handleSkip = useCallback(() => {
        handleClose();
    }, [handleClose]);

    // 键盘导航
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            } else if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNext();
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                handlePrevious();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleClose, handleNext, handlePrevious]);

    const act = TUTORIAL_ACTS[currentAct];
    const progress = ((currentAct + 1) / TUTORIAL_ACTS.length) * 100;

    return (
        <div className={`tutorial-overlay ${isVisible ? 'visible' : ''} ${isClosing ? 'closing' : ''}`}>
            <div className={`tutorial-container theme-${act.theme}`}>
                {/* 背景效果 */}
                {act.particles && (
                    <div className="tutorial-particles">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="particle" style={{
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }} />
                        ))}
                    </div>
                )}

                {/* 主要内容区域 */}
                <div className="tutorial-content">
                    {/* 标题 */}
                    <h2 className="tutorial-title">{act.title}</h2>

                    {/* 文字内容 */}
                    <div className="tutorial-texts">
                        {act.texts.slice(0, textIndex + 1).map((text, idx) => (
                            <p key={idx} className="tutorial-text" style={{
                                animationDelay: `${idx * 0.15}s`
                            }}>
                                {text}
                            </p>
                        ))}
                    </div>

                    {/* 视觉元素 */}
                    {act.showCards && (
                        <div className="tutorial-visual cards-visual">
                            <div className="card-demo">🔥</div>
                            <div className="plus-sign">+</div>
                            <div className="card-demo">🪨</div>
                            <div className="equals-sign">=</div>
                            <div className="card-demo result">🔨</div>
                        </div>
                    )}

                    {act.showAvatar && (
                        <div className="tutorial-visual avatar-visual">
                            <div className="player-avatar">👤</div>
                        </div>
                    )}

                    {act.showForge && (
                        <div className="tutorial-visual forge-visual">
                            <div className="forge-icon">⚗️</div>
                            <div className="forge-glow"></div>
                        </div>
                    )}

                    {act.showProgress && (
                        <div className="tutorial-visual progress-visual">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: '35%' }}></div>
                            </div>
                            <div className="progress-label">文明进化: 35%</div>
                        </div>
                    )}
                </div>

                {/* 底部控制栏 */}
                <div className="tutorial-controls">
                    {/* 进度指示器 */}
                    <div className="tutorial-progress">
                        <div className="progress-track">
                            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="progress-dots">
                            {TUTORIAL_ACTS.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`dot ${idx === currentAct ? 'active' : ''} ${idx < currentAct ? 'completed' : ''}`}
                                    onClick={() => {
                                        setCurrentAct(idx);
                                        setTextIndex(0);
                                    }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* 按钮组 */}
                    <div className="tutorial-buttons">
                        <button
                            className="tutorial-btn btn-skip"
                            onClick={handleSkip}
                        >
                            跳过
                        </button>

                        <div className="tutorial-nav-buttons">
                            <button
                                className="tutorial-btn btn-prev"
                                onClick={handlePrevious}
                                disabled={currentAct === 0}
                            >
                                ← 上一幕
                            </button>

                            <button
                                className="tutorial-btn btn-next"
                                onClick={handleNext}
                            >
                                {act.isFinal ? '开始冒险 →' : '下一幕 →'}
                            </button>
                        </div>
                    </div>

                    {/* 提示文字 */}
                    <div className="tutorial-hint">
                        按 → 或 Enter 继续 · 按 Esc 关闭
                    </div>
                </div>

                {/* 关闭按钮 */}
                <button className="tutorial-close" onClick={handleClose} aria-label="关闭">
                    ✕
                </button>
            </div>
        </div>
    );
}

