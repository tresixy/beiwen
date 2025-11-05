import { useCallback, useEffect, useMemo, useState } from 'react';

import { AuthScreen } from './components/auth/AuthScreen.jsx';
import { GameShell } from './components/game/GameShell.jsx';
import { Lobby } from './components/lobby/Lobby.jsx';
import { MessageStack } from './components/common/MessageStack.jsx';
import { TutorialGuide } from './components/common/TutorialGuide.jsx';
import { EditorPage } from './pages/EditorPage.jsx';
import { loginRequest } from './services/api.js';
import { preloadUIAssets, preloadLandmarkImages } from './utils/preloadImages.js';
import { useHelpTrigger } from './hooks/useHelpTrigger.js';

const STORAGE_KEYS = {
    token: 'inf-synth-token',
    user: 'inf-synth-user',
    tutorialShown: 'inf-synth-tutorial-shown',
};

const createMessageId = () => {
    const globalCrypto = typeof window !== 'undefined' ? window.crypto : undefined;
    if (globalCrypto?.randomUUID) {
        return globalCrypto.randomUUID();
    }
    return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

function App() {
    const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEYS.token));
    const [user, setUser] = useState(() => {
        const raw = localStorage.getItem(STORAGE_KEYS.user);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (err) {
            console.warn('Failed to parse stored user', err);
            return null;
        }
    });
    const [authLoading, setAuthLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [showTutorial, setShowTutorial] = useState(false);
    const [activeView, setActiveView] = useState(() => {
        // 检查URL路径来确定初始视图
        const path = window.location.pathname;
        if (path.startsWith('/editor')) return 'editor';
        if (path.startsWith('/adminai')) return 'admin';
        if (path.startsWith('/cardsdatabase')) return 'admin';
        if (path.startsWith('/playerarchives')) return 'admin';
        return 'lobby';
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem(STORAGE_KEYS.token, token);
        } else {
            localStorage.removeItem(STORAGE_KEYS.token);
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
        } else {
            localStorage.removeItem(STORAGE_KEYS.user);
        }
    }, [user]);

    const queueMessage = useCallback((content, tone = 'info') => {
        setMessages((prev) => [
            ...prev,
            {
                id: createMessageId(),
                content,
                tone,
            },
        ]);
    }, []);

    const dismissMessage = useCallback((id) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }, []);

    const handleAuthSuccess = useCallback((payload) => {
        console.log('[Auth] 保存认证信息', { hasToken: !!payload.token, user: payload.user });
        setToken(payload.token);
        setUser(payload.user);
        setActiveView('lobby');
        
        // 检查是否首次登录
        const tutorialShown = localStorage.getItem(STORAGE_KEYS.tutorialShown);
        if (!tutorialShown) {
            // 首次登录，延迟显示引导
            setTimeout(() => {
                setShowTutorial(true);
            }, 500);
        }
    }, []);

    const handleLogin = useCallback(
        async (credentials) => {
            setAuthLoading(true);
            try {
                console.log('[Login] 开始登录请求', { email: credentials.email });
                const data = await loginRequest(credentials);
                console.log('[Login] 登录成功', { user: data.user, hasToken: !!data.token });
                handleAuthSuccess(data);
                queueMessage('登录成功，欢迎回来。', 'success');
                return { success: true };
            } catch (err) {
                console.error('[Login] 登录失败', err);
                const message = err?.message || '登录失败，请稍后再试。';
                queueMessage(message, 'error');
                throw new Error(message);
            } finally {
                setAuthLoading(false);
            }
        },
        [handleAuthSuccess, queueMessage],
    );


    const handleLogout = useCallback(() => {
        setToken(null);
        setUser(null);
        setActiveView('lobby');
        queueMessage('已安全退出登录。', 'info');
    }, [queueMessage]);

    const handleEnterGame = useCallback(() => {
        setActiveView('game');
    }, []);

    const handleBackLobby = useCallback(() => {
        setActiveView('lobby');
        window.history.pushState({}, '', '/');
        // 触发刷新地块标记的事件
        setTimeout(() => {
            window.dispatchEvent(new Event('refreshTileMarkers'));
        }, 100);
    }, []);

    const handleEnterAdmin = useCallback(() => {
        setActiveView('admin');
        window.history.pushState({}, '', '/adminai/');
    }, []);

    const handleCloseTutorial = useCallback(() => {
        setShowTutorial(false);
        // 标记引导已展示
        localStorage.setItem(STORAGE_KEYS.tutorialShown, 'true');
    }, []);

    // 监听 "help" 触发引导
    useHelpTrigger(() => {
        setShowTutorial(true);
    }, true);

    // 监听浏览器前进后退
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path.startsWith('/adminai') || path.startsWith('/cardsdatabase') || path.startsWith('/playerarchives')) {
                setActiveView('admin');
            } else {
                setActiveView('lobby');
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    const screen = useMemo(() => {
        if (!token) {
            return (
                <AuthScreen
                    onLogin={handleLogin}
                    loading={authLoading}
                />
            );
        }

        if (activeView === 'lobby') {
            return (
                <Lobby
                    user={user}
                    token={token}
                    onEnterGame={handleEnterGame}
                    onLogout={handleLogout}
                    onEnterAdmin={handleEnterAdmin}
                />
            );
        }

        if (activeView === 'admin') {
            // 管理后台直接跳转到独立HTML页面
            window.location.href = '/adminai/';
            return <div className="loading">正在跳转到管理后台...</div>;
        }

        if (activeView === 'editor') {
            return <EditorPage />;
        }

        return (
            <GameShell
                user={user}
                token={token}
                onLogout={handleLogout}
                onBackLobby={handleBackLobby}
                pushMessage={queueMessage}
            />
        );
    }, [activeView, authLoading, handleBackLobby, handleEnterAdmin, handleEnterGame, handleLogin, handleLogout, queueMessage, token, user]);

    useEffect(() => {
        // 并行预加载 UI 素材和 Landmark 插画
        Promise.all([
            preloadUIAssets(),
            preloadLandmarkImages(),
        ]).then(() => {
            console.log('[App] 所有资源预加载完成');
            window.dispatchEvent(new Event('app-ready'));
        }).catch((err) => {
            console.error('[App] 资源预加载出错', err);
            // 即使预加载失败也要触发 app-ready
            window.dispatchEvent(new Event('app-ready'));
        });
    }, []);

    return (
        <div id="app">
            {screen}
            <MessageStack messages={messages} onDismiss={dismissMessage} />
            {showTutorial && <TutorialGuide onClose={handleCloseTutorial} />}
        </div>
    );
}

export default App;
