# 스마일 소장의 프롬프트 툴

이미지 프롬프트 템플릿을 변수만 바꿔서 바로 쓸 수 있는 웹앱.
[prompts3.com](http://prompts3.com) 형태의 UI 구조 + 하이탑부동산 네이비/골드 브랜딩.

## 주요 기능
- 프롬프트 안의 `{{변수}}` 또는 `[변수]` 형식 자동 감지
- 변수마다 입력 칸 자동 생성 → 입력값이 실시간 반영
- 결과 프롬프트는 직접 편집도 가능
- 전체 복사 / 초기화 버튼
- 샘플 이미지 업로드 (JPG/PNG/WebP)
- 모바일 반응형 + 다크 네이비 테마
- 로그인/저장 없음 (브라우저 안에서만 동작)

## 개발 실행
```bash
npm install
npm run dev
```

## 빌드
```bash
npm run build
npm run preview   # 빌드 결과 확인
```

## GitHub Pages 배포
1. GitHub에 저장소 생성 후 푸시
2. `npm run build`
3. `npm run deploy` (gh-pages 브랜치로 자동 배포)
4. 저장소 Settings → Pages → Source: `gh-pages` 브랜치 / `/ (root)` 선택

> `vite.config.js` 의 `base: './'` 설정으로 어떤 경로에 배포해도 동작합니다.

## 기술 스택
- React 18 + Vite 5
- 외부 상태 관리, DB 없음 (의도적으로 단순화)

## 변수 형식 예시
```
{{브랜드명}} 로고를 [스타일] 풍으로 그려주세요.
메인 컬러는 [컬러], 배경은 {{배경}}.
```
→ 변수 추출 시 `브랜드명 / 스타일 / 컬러 / 배경` 자동 인식 (중복 제거됨).
