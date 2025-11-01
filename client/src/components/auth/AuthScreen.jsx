import { useCallback, useState } from 'react';

export function AuthScreen({ onLogin, loading }) {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleEmailChange = useCallback((event) => {
        setEmail(event.target.value);
    }, []);

    const validateEmail = useCallback(() => {
        if (!email.trim()) {
            return '请输入邮箱地址';
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            return '请输入有效的邮箱地址';
        }
        return '';
    }, [email]);

    const handleSubmit = useCallback(async (event) => {
        event.preventDefault();
        setError('');

        const invalid = validateEmail();
        if (invalid) {
            setError(invalid);
            return;
        }

        try {
            await onLogin({
                email: email.trim(),
            });
        } catch (err) {
            setError(err?.message || '操作失败，请稍后再试');
        }
    }, [email, onLogin, validateEmail]);

    return (
        <div className="auth-screen">
            <div className="auth-card">
                <h1>无限合成</h1>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <label htmlFor="email">邮箱</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="请输入您的邮箱"
                            value={email}
                            onChange={handleEmailChange}
                            disabled={loading}
                        />
                    </div>
                    <div className="auth-hint" style={{ color: '#ffcc80', border: '1px solid rgba(255,204,128,0.35)', marginBottom: '1rem' }}>
                        请使用公司邮箱登录，与最后奖励结算有关哦
                    </div>
                    {error ? (
                        <div className="auth-hint" style={{ color: '#ff8080', border: '1px solid rgba(255,128,128,0.35)' }}>
                            {error}
                        </div>
                    ) : null}
                    <button className="auth-button" type="submit" disabled={loading}>
                        {loading ? '处理中…' : '进入熔炉'}
                    </button>
                </form>
                <div className="auth-hint">
                    这是一款由 AI 与合成哲学驱动的策略体验。首次使用邮箱登录将自动创建账号。
                </div>
            </div>
        </div>
    );
}




