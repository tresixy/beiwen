import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
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



