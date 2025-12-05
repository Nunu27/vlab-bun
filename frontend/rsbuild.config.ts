import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/rspack';
import { pluginTypeCheck } from '@rsbuild/plugin-type-check';

export default defineConfig({
  plugins: [pluginReact(), pluginTypeCheck()],
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
      '/display': { target: 'http://localhost:8080', ws: true },
      '/api': 'http://localhost:3000',
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
