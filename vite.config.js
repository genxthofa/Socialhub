import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
    server: {
        host: '127.0.0.1',
    },
    plugins: [
        laravel({
            input: ['resources/js/main.jsx'],
            refresh: true,
        }),
        react(),
    ],
});
