import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';

export default defineConfig({
  plugins: [pluginReact()],
  output: {
    distPath: { root: '../build/public' },
    cleanDistPath: {
      enable: true,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/ws': { target: 'http://localhost:3000', ws: true },
      '/api': 'http://localhost:3000',
      '/display': 'http://localhost:8080',
    },
  },
  html: {
    title: 'vLab',
  },
  tools: {
    rspack: {
      plugins: [
        tanstackRouter({
          target: 'react',
          autoCodeSplitting: true,
        }),
      ],
    },
  },
});
