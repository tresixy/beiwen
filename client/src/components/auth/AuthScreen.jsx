import { useCallback, useState, useEffect } from 'react';
import { preloadAll2DImages } from '../../utils/preloadImages';

export function AuthScreen({ onLogin, loading }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleEmailChange = useCallback((event) => {
        setEmail(event.target.value);
    }, []);

    const handlePasswordChange = useCallback((event) => {
        setPassword(event.target.value);
    }, []);

    const validateForm = useCallback(() => {
        if (!email.trim()) {
            return '请输入邮箱地址';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return '请输入有效的邮箱地址';
        }
        if (!password) {
            return '请输入密码';
        }
        if (password.length < 6) {
            return '密码至少6位';
        }
        return '';
    }, [email, password]);

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        setError('');

        const invalid = validateForm();
        if (invalid) {
            setError(invalid);
            return;
        }

        try {
            await onLogin({
                email: email.trim(),
                password: password,
            });
        } catch (err) {
            setError(err?.message || '操作失败，请稍后再试');
        }
    }, [email, password, onLogin, validateForm]);

    // 组件挂载时预加载所有2D图片
    useEffect(() => {
        preloadAll2DImages().catch(err => {
            console.warn('[Preload] 2D图片预加载失败:', err);
        });
    }, []);

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <h1>Oops, Civilization !</h1>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field auth-field--email">
                        <label htmlFor="email">公司邮箱</label>
                        <div className="auth-field__input-wrapper">
                            <img src="/assets/UI/email.webp" alt="" className="auth-field__icon" />
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                placeholder="请输入您的公司邮箱"
                                value={email}
                                onChange={handleEmailChange}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="auth-field auth-field--password">
                        <label htmlFor="password">初始密码</label>
                        <div className="auth-field__input-wrapper">
                            <img src="/assets/UI/key.webp" alt="" className="auth-field__icon" />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="请输入密码（至少6位）"
                                value={password}
                                onChange={handlePasswordChange}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="auth-hint" style={{ color: '#ffcc80', border: '1px solid rgba(255,204,128,0.35)', marginBottom: '1rem' }}>
                        请使用公司邮箱登录。首次登录自动注册账号。
                    </div>
                    {error ? (
                        <div className="auth-hint" style={{ color: '#ff8080', border: '1px solid rgba(255,128,128,0.35)' }}>
                            {error}
                        </div>
                    ) : null}
                    <button 
                        className="auth-button auth-button-image" 
                        type="submit" 
                        disabled={loading}
                        style={{
                            backgroundImage: loading ? 'linear-gradient(135deg, #ff9447, #ffb66f)' : 'url(/assets/UI/继续按钮.webp)',
                            backgroundSize: 'contain',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            backgroundColor: 'transparent',
                            height: '80px',
                            width: '100%',
                            border: 'none',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: loading ? '1rem' : '0',
                            color: loading ? '#fff' : 'transparent',
                            fontWeight: 'bold'
                        }}
                    >
                        {loading ? '处理中…' : '\u00A0'}
                    </button>
                </form>
            </div>
        </div>
    );
}




