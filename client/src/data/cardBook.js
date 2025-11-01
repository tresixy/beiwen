// 卡册数据管理

const CARD_BOOK_STORAGE_KEY = 'inf-synth-card-book';

const now = () => Date.now();

const cardEquals = (a, b) => a.name === b.name && a.type === b.type && a.rarity === b.rarity;

export function createInitialCardBook() {
    return {
        cards: [],
        totalCollected: 0,
    };
}

export function addCardToBook(cardBook, card) {
    const timestamp = now();
    let found = false;
    const cards = cardBook.cards.map((entry) => {
        if (cardEquals(entry, card)) {
            found = true;
            return {
                ...entry,
                count: entry.count + 1,
                lastObtained: timestamp,
            };
        }
        return entry;
    });

    if (!found) {
        cards.push({
            ...card,
            count: 1,
            firstObtained: timestamp,
            lastObtained: timestamp,
        });
    }

    return {
        cards,
        totalCollected: cardBook.totalCollected + 1,
    };
}

export function hasCard(cardBook, card) {
    return cardBook.cards.some((entry) => cardEquals(entry, card));
}

export function getCardCount(cardBook, card) {
    const existing = cardBook.cards.find((entry) => cardEquals(entry, card));
    return existing ? existing.count : 0;
}

export function persistCardBook(cardBook) {
    if (typeof window === 'undefined') {
        return cardBook;
    }
    try {
        window.localStorage.setItem(CARD_BOOK_STORAGE_KEY, JSON.stringify(cardBook));
    } catch (err) {
        console.warn('Failed to persist card book', err);
    }
    return cardBook;
}

export function loadCardBook() {
    if (typeof window === 'undefined') {
        return createInitialCardBook();
    }
    try {
        const raw = window.localStorage.getItem(CARD_BOOK_STORAGE_KEY);
        if (!raw) {
            return createInitialCardBook();
        }
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return createInitialCardBook();
        }
        return {
            cards: Array.isArray(parsed.cards) ? parsed.cards : [],
            totalCollected: Number.isFinite(parsed.totalCollected) ? parsed.totalCollected : 0,
        };
    } catch (err) {
        console.warn('Failed to load card book', err);
        return createInitialCardBook();
    }
}

