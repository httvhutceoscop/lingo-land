import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

const pkgVersion = pkg.version;

function googleTagPlugin(tagId: string): Plugin {
  return {
    name: 'inject-google-tag',
    transformIndexHtml(html) {
      if (!tagId) return html;
      const snippet = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${tagId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  // send_page_view: false — HashRouter là SPA, page_view được bắn thủ công theo
  // từng route ở src/lib/analytics.ts. Tắt auto để khỏi đếm trùng trang đầu.
  gtag('config', '${tagId}', { send_page_view: false });
</script>`;
      return html.replace('</head>', `  ${snippet}\n</head>`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const googleTag = env.VITE_GOOGLE_TAG ?? '';
  return {
    base: '/lingo-land/',
    define: {
      __APP_VERSION__: JSON.stringify(pkgVersion),
    },
    plugins: [
      googleTagPlugin(googleTag),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icon.svg', 'icon-maskable.svg'],
        manifest: {
          name: 'LingoLand - English Adventure',
          short_name: 'LingoLand',
          description: 'Học từ vựng tiếng Anh qua trò chơi phiêu lưu đảo.',
          lang: 'vi',
          theme_color: '#10b981',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/lingo-land/',
          start_url: '/lingo-land/',
          icons: [
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any',
            },
            {
              src: 'icon-maskable.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 14 * 1024 * 1024,
          globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
          // Mỗi lần build/deploy, SW mới sẽ chiếm quyền ngay và xoá precache của
          // bản cũ — người dùng luôn nhận code mới nhất mà không cần reload thủ công.
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === 'https://cdn.tailwindcss.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'tailwind-cdn',
                expiration: { maxEntries: 4, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === 'https://fonts.googleapis.com' ||
                url.origin === 'https://fonts.gstatic.com',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              },
            },
            {
              urlPattern: ({ url }) => url.origin === 'https://assets.mixkit.co',
              handler: 'CacheFirst',
              options: {
                cacheName: 'sfx',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 90 },
                rangeRequests: true,
              },
            },
            {
              urlPattern: ({ url }) =>
                url.origin === 'https://translate.google.com' &&
                url.pathname === '/translate_tts',
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-tts',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] },
                rangeRequests: true,
              },
            },
          ],
        },
      }),
    ],
  };
});
