import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    uni(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',  // 后端 Spring Boot 地址
        changeOrigin: true,  // 改写请求头的 origin，避免后端 CORS 拒绝
        // 不需要 rewrite，因为后端 context-path 已经是 /api
      }
    }
  }
})
