import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: {
        '/api': { target: env.API_PROXY_TARGET || 'http://127.0.0.1:3000', changeOrigin: true },
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'antd',
                maxSize: 800_000,
                test: /node_modules[\\/](?:\.pnpm[\\/])?(?:antd|@ant-design|@rc-component)/,
              },
            ],
          },
        },
      },
    },
    test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], css: true },
  };
});
