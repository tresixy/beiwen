import { useEffect, useState, useRef } from 'react';
import './ChronicleToast.css';

export function ChronicleToast({ logEntry, visible = true }) {
    const [show, setShow] = useState(false);
    const [displayedText, setDisplayedText] = useState('');
    const typingIntervalRef = useRef(null);

    useEffect(() => {
        if (logEntry && visible) {
            setShow(true);
            setDisplayedText('');
            
            // 打字机效果：逐字显示
            let currentIndex = 0;
            typingIntervalRef.current = setInterval(() => {
                if (currentIndex < logEntry.length) {
                    setDisplayedText(logEntry.substring(0, currentIndex + 1));
                    currentIndex++;
                } else {
                    clearInterval(typingIntervalRef.current);
                }
            }, 60); // 每个字60ms
            
            return () => {
                if (typingIntervalRef.current) {
                    clearInterval(typingIntervalRef.current);
                }
            };
        } else {
            setShow(false);
            setDisplayedText('');
        }
    }, [logEntry, visible]);

    if (!logEntry) return null;

    return (
        <div className={`chronicle-toast ${show ? 'visible' : ''}`}>
            <div className="chronicle-toast-content">
                {displayedText}
                {displayedText.length < logEntry.length && (
                    <span className="typing-cursor">|</span>
                )}
            </div>
        </div>
    );
}

