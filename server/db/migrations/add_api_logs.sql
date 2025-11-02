-- API调用日志表
CREATE TABLE IF NOT EXISTS api_logs (
    id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    request_body JSONB,
    response_body JSONB,
    status_code INTEGER,
    duration_ms INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint ON api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_endpoint_created ON api_logs(endpoint, created_at DESC);

-- 添加注释
COMMENT ON TABLE api_logs IS 'API调用日志表，记录所有API请求和响应';
COMMENT ON COLUMN api_logs.endpoint IS 'API端点路径';
COMMENT ON COLUMN api_logs.request_body IS '请求体（JSON）';
COMMENT ON COLUMN api_logs.response_body IS '响应体（JSON，可能截断）';
COMMENT ON COLUMN api_logs.duration_ms IS '请求处理时间（毫秒）';


