import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/', // 使用绝对路径，支持子路由
    plugins: [
        react(),
    ],
    server: {
        port: 5173
    }
})
