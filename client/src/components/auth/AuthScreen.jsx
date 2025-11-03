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
            return '请输入用户名或邮箱';
        }
        
        // 如果包含 @，验证完整邮箱格式
        if (email.includes('@')) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email.trim())) {
                return '请输入有效的邮箱地址';
            }
        }
        // 如果不包含 @，只验证用户名部分
        else {
            const usernameRegex = /^[a-zA-Z0-9._-]+$/;
            if (!usernameRegex.test(email.trim())) {
                return '用户名只能包含字母、数字、点、下划线和横线';
            }
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
            // 处理邮箱：自动添加 @garena.com 后缀
            let finalEmail = email.trim();
            if (finalEmail && !finalEmail.includes('@')) {
                finalEmail = finalEmail + '@garena.com';
            }
            
            await onLogin({
                email: finalEmail,
                password: password.trim(), // 去除密码前后空格
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
                <img src="/assets/UI/Logo.webp" alt="Oops, Civilization!" className="auth-logo" />
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field auth-field--email">
                        <label htmlFor="email">公司邮箱</label>
                        <div className="auth-field__input-wrapper" style={{ position: 'relative' }}>
                            <img src="/assets/UI/email.webp" alt="" className="auth-field__icon" />
                            <input
                                id="email"
                                name="email"
                                type="text"
                                autoComplete="email"
                                placeholder="请输入用户名"
                                value={email}
                                onChange={handleEmailChange}
                                disabled={loading}
                                style={{ paddingRight: email.includes('@') ? '10px' : '120px' }}
                            />
                            {!email.includes('@') && (
                                <span style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: '#888',
                                    fontSize: '0.9rem',
                                    pointerEvents: 'none',
                                    userSelect: 'none'
                                }}>
                                    @garena.com
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="auth-field auth-field--password">
                        <label htmlFor="password">
                            初始密码
                            <span style={{
                                fontSize: '0.75rem',
                                color: '#ffcc80',
                                marginLeft: '8px',
                                fontWeight: 'normal'
                            }}>
                                （避免输入公司实际密码，请使用其他密码进行登录，初次登入会自动注册）
                            </span>
                        </label>
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
                        输入用户名即可（自动添加 @garena.com）。首次登录会自动注册账号。
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
                            fontWeight: 'bold',
                            marginTop: '-10px'
                        }}
                    >
                        {loading ? '处理中…' : '\u00A0'}
                    </button>
                </form>
            </div>
        </div>
    );
}




