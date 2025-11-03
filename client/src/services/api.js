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

    let response;
    try {
        response = await fetch(path, {
            method,
            headers: requestHeaders,
            body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        });
    } catch (err) {
        // 网络错误或其他fetch错误
        console.error('[API] Fetch error:', err);
        throw new Error('网络错误，请检查网络连接');
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    let payload;
    try {
        payload = isJson ? await response.json() : await response.text();
    } catch (err) {
        // 如果解析失败，尝试作为文本处理
        payload = await response.text();
    }

    if (!response.ok) {
        let message = '请求失败';
        if (typeof payload === 'string') {
            message = payload;
        } else if (payload) {
            // 优先使用 error 字段
            if (payload.error) {
                message = payload.error;
                // 如果有验证错误详情，提取第一条
                if (payload.details && Array.isArray(payload.details) && payload.details.length > 0) {
                    const firstDetail = payload.details[0];
                    if (firstDetail.message) {
                        message = firstDetail.message;
                    }
                }
            } else if (payload.message) {
                message = payload.message;
            }
        }
        throw new Error(message);
    }

    return payload;
}

export function loginRequest({ email, password }) {
    // 确保密码是字符串且去除前后空格
    const cleanPassword = typeof password === 'string' ? password.trim() : password;
    console.log('[API] 登录请求', { email, passwordLength: cleanPassword.length });
    return apiRequest('/api/auth/login', {
        method: 'POST',
        body: { email: email.trim(), password: cleanPassword },
    });
}




