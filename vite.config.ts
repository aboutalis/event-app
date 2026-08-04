import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
	server: {
		host: '::',
		port: 8080,
	},
	plugins: [
		react(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: [
				'favicon.svg',
				'favicon-16x16.png',
				'favicon-32x32.png',
				'apple-touch-icon.png',
			],
			manifest: {
				id: '/',
				name: 'Γάμος & Βάπτιση',
				short_name: 'Γάμος',
				description: 'Διαχείριση προσκλήσεων και εξόδων',
				lang: 'el',
				dir: 'ltr',
				theme_color: '#FFFFFF',
				background_color: '#F8F6F2',
				display: 'standalone',
				orientation: 'portrait',
				scope: '/',
				start_url: '/',
				categories: ['productivity', 'lifestyle'],
				icons: [
					{
						src: 'pwa-64x64.png',
						sizes: '64x64',
						type: 'image/png',
					},
					{
						src: 'pwa-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any',
					},
					{
						src: 'pwa-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any',
					},
					{
						src: 'maskable-icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'maskable',
					},
				],
				shortcuts: [
					{
						name: 'Προσκλήσεις',
						url: '/admin',
						icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
					},
					{
						name: 'Έξοδα',
						url: '/costs',
						icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
					},
				],
			},
			devOptions: {
				// lets you test install / offline behaviour with `npm run dev`
				enabled: true,
				type: 'module',
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
				cleanupOutdatedCaches: true,
				clientsClaim: true,
				// SPA: any unknown route falls back to the app shell
				navigateFallback: '/index.html',
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-cache',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24 // 24 hours
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			}
		})
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
});
