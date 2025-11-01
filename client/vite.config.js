import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/', // 使用绝对路径，避免子路径资源加载问题
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          'phaser': ['phaser'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});

