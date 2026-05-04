import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포를 위한 base 설정
// 저장소 이름을 prompt-tool 로 가정. 실제 저장소명에 맞게 변경하세요.
export default defineConfig({
  plugins: [react()],
  base: './',
})
