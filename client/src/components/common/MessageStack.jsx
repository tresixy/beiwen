import { useEffect } from 'react';

const TONE_STYLE = {
    info: {
        borderColor: 'rgba(78, 205, 196, 0.35)',
        color: '#000000',
    },
    success: {
        borderColor: 'rgba(110, 205, 120, 0.45)',
        color: '#000000',
    },
    error: {
        borderColor: 'rgba(255, 128, 128, 0.45)',
        color: '#000000',
    },
    warning: {
        borderColor: 'rgba(255, 193, 7, 0.45)',
        color: '#000000',
    },
};

function MessageItem({ message, onDismiss }) {
    useEffect(() => {
        const timer = window.setTimeout(() => onDismiss(message.id), 3200);
        return () => window.clearTimeout(timer);
    }, [message.id, onDismiss]);

    const toneStyle = TONE_STYLE[message.tone] ?? TONE_STYLE.info;

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








