const DEFAULT_HEADERS = {
    'Content-Type': 'application/json',
};

export async function apiRequest(path, { method = 'GET', body, token, headers } = {}) {
    const requestHeaders = new Headers(headers || {});

    if (body !== undefined && !requestHeaders.has('Content-Type')) {
        Object.entries(DEFAULT_HEADERS).forEach(([key, value]) => {
            requestHeaders.set(key, value);
        });
    }

    if (token) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(path, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
        const message = typeof payload === 'string' ? payload : payload?.message || '请求失败';
        throw new Error(message);
    }

    return payload;
}

export function loginRequest({ email }) {
    return apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email },
    });
}




