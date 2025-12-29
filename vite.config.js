import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // [추가] 프록시 설정이 있다면 여기서 시간을 늘려줍니다.
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://localhost:3000", // 백엔드 주소 (환경변수에서 가져옴)
        changeOrigin: true,
        secure: false,
        timeout: 60000, // 60초 (기본값은 보통 30초)
        proxyTimeout: 60000, // 60초
      },
    },
    // [추가] 혹시 프록시를 안 쓰더라도 기본 타임아웃을 늘립니다.
    timeout: 60000,
  },
});
