import { useCallback, useEffect, useMemo, useState } from 'react';

import { AuthScreen } from './components/auth/AuthScreen.jsx';
import { GameShell } from './components/game/GameShell.jsx';
import { Lobby } from './components/lobby/Lobby.jsx';
import { MessageStack } from './components/common/MessageStack.jsx';
import { CardsDatabase } from './components/admin/CardsDatabase.jsx';
import { PlayerArchivesPanel } from './components/admin/PlayerArchivesPanel.jsx';
import { loginRequest } from './services/api.js';
import { preloadUIAssets } from './utils/preloadImages.js';

const STORAGE_KEYS = {
    token: 'inf-synth-token',
    user: 'inf-synth-user',
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
    const [activeView, setActiveView] = useState(() => {
        // 检查URL路径来确定初始视图
        const path = window.location.pathname;
        if (path.startsWith('/cardsdatabase')) return 'cardsdatabase';
        if (path.startsWith('/playerarchives')) return 'playerarchives';
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
        setToken(payload.token);
        setUser(payload.user);
        setActiveView('lobby');
    }, []);

    const handleLogin = useCallback(
        async (credentials) => {
            setAuthLoading(true);
            try {
                const data = await loginRequest(credentials);
                handleAuthSuccess(data);
                queueMessage('登录成功，欢迎回来。', 'success');
                return { success: true };
            } catch (err) {
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
    }, []);

    const handleEnterCardsDatabase = useCallback(() => {
        setActiveView('cardsdatabase');
        window.history.pushState({}, '', '/cardsdatabase/');
    }, []);

    const handleOpenPlayerArchives = useCallback(() => {
        setActiveView('playerarchives');
        window.history.pushState({}, '', '/playerarchives/');
    }, []);

    // 监听浏览器前进后退
    useEffect(() => {
        const handlePopState = () => {
            const path = window.location.pathname;
            if (path.startsWith('/cardsdatabase')) {
                setActiveView('cardsdatabase');
            } else if (path.startsWith('/playerarchives')) {
                setActiveView('playerarchives');
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
                    onEnterCardsDatabase={handleEnterCardsDatabase}
                    onOpenPlayerArchives={handleOpenPlayerArchives}
                />
            );
        }

        if (activeView === 'cardsdatabase') {
            return (
                <CardsDatabase
                    token={token}
                    onBack={handleBackLobby}
                />
            );
        }

        if (activeView === 'playerarchives') {
            return (
                <PlayerArchivesPanel
                    token={token}
                    onBack={handleBackLobby}
                />
            );
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
    }, [activeView, authLoading, handleBackLobby, handleEnterCardsDatabase, handleEnterGame, handleLogin, handleLogout, handleOpenPlayerArchives, queueMessage, token, user]);

    useEffect(() => {
        // 预加载 UI 素材后再触发 app-ready
        preloadUIAssets().then(() => {
            window.dispatchEvent(new Event('app-ready'));
        }).catch(() => {
            // 即使预加载失败也要触发 app-ready
            window.dispatchEvent(new Event('app-ready'));
        });
    }, []);

    return (
        <div id="app">
            {screen}
            <MessageStack messages={messages} onDismiss={dismissMessage} />
        </div>
    );
}

export default App;
