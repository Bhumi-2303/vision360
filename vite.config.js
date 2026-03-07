import { defineConfig } from 'vite';

export default defineConfig({
  root: 'public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './public/index.html',
        viewer: './public/viewer.html',
        admin_login: './public/admin/login.html',
        admin_dashboard: './public/admin/dashboard.html'
      }
    }
  },
  server: {
    open: true
  }
});
