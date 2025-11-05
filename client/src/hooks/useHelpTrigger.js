import { useEffect, useRef } from 'react';

/**
 * 监听用户在页面任何位置键入 "help" 触发回调
 * @param {Function} onTrigger - 当输入 "help" 时触发的回调
 * @param {boolean} enabled - 是否启用监听
 */
export function useHelpTrigger(onTrigger, enabled = true) {
    const bufferRef = useRef('');
    const timerRef = useRef(null);

    useEffect(() => {
        if (!enabled) return;

        const handleKeyPress = (e) => {
            // 如果在输入框中输入，跳过
            if (
                e.target.tagName === 'INPUT' ||
                e.target.tagName === 'TEXTAREA' ||
                e.target.isContentEditable
            ) {
                return;
            }

            // 记录按键
            const key = e.key.toLowerCase();
            if (key.length === 1 && /[a-z]/.test(key)) {
                bufferRef.current += key;

                // 检查是否匹配 "help"
                if (bufferRef.current.endsWith('help')) {
                    bufferRef.current = '';
                    onTrigger?.();
                }

                // 限制缓冲区长度
                if (bufferRef.current.length > 10) {
                    bufferRef.current = bufferRef.current.slice(-10);
                }

                // 清理定时器
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }

                // 1秒无输入则清空缓冲区
                timerRef.current = setTimeout(() => {
                    bufferRef.current = '';
                }, 1000);
            }
        };

        window.addEventListener('keypress', handleKeyPress);

        return () => {
            window.removeEventListener('keypress', handleKeyPress);
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [enabled, onTrigger]);
}

