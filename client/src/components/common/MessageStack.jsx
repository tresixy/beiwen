import { useEffect } from 'react';

const TONE_STYLE = {
    info: {
        borderColor: 'rgba(78, 205, 196, 0.35)',
        color: '#e0f7ff',
    },
    success: {
        borderColor: 'rgba(110, 205, 120, 0.45)',
        color: '#e6ffe9',
    },
    error: {
        borderColor: 'rgba(255, 128, 128, 0.45)',
        color: '#ffe7e7',
    },
};

function MessageItem({ message, onDismiss }) {
    useEffect(() => {
        const timer = window.setTimeout(() => onDismiss(message.id), 3200);
        return () => window.clearTimeout(timer);
    }, [message.id, onDismiss]);

    let toneStyle = TONE_STYLE[message.tone] ?? TONE_STYLE.info;
    
    // 如果是"手牌已满，无需抽牌"的消息，使用白底黑色样式
    if (message.content === '手牌已满，无需抽牌。') {
        toneStyle = {
            backgroundColor: '#ffffff',
            color: '#000000',
            borderColor: 'rgba(0, 0, 0, 0.3)',
        };
    }

    return (
        <div className="message" style={toneStyle}>
            {message.content}
        </div>
    );
}

export function MessageStack({ messages, onDismiss }) {
    if (!messages || messages.length === 0) {
        return null;
    }

    return (
        <div className="message-stack">
            {messages.map((message) => (
                <MessageItem key={message.id} message={message} onDismiss={onDismiss} />
            ))}
        </div>
    );
}








