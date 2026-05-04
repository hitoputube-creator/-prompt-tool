# 이미지 → 프롬프트 추출 기능 배포 안내

이 기능은 Anthropic API 키를 안전하게 보관하기 위해 **Supabase Edge Function** 을
프록시로 사용합니다. 한 번만 셋업하면 됩니다.

## 0. 사전 준비
- Anthropic API 키 (없으면 https://console.anthropic.com 에서 발급, **무료 크레딧 또는 결제 등록 필요**)

---

## A안. Supabase Dashboard 로 배포 (CLI 설치 불필요, 추천)

### 1) Edge Function 생성
1. https://supabase.com/dashboard/project/xaxbkdnrzsghsabkdvzj/functions 접속
2. **Deploy a new function** 클릭 → **Via Editor** 선택
3. Function name: `extract-prompt`
4. 코드 영역에 [supabase/functions/extract-prompt/index.ts](supabase/functions/extract-prompt/index.ts) 파일 내용 **전체 복사 → 붙여넣기**
5. **Deploy function** 클릭

### 2) Anthropic API Key 등록 (Secret)
1. https://supabase.com/dashboard/project/xaxbkdnrzsghsabkdvzj/functions/secrets 접속
2. **Add new secret** 클릭
3. Name: `ANTHROPIC_API_KEY`
4. Value: `sk-ant-api03-...` (본인 키)
5. **Save** 클릭

### 3) 동작 확인
앱 → 작업 화면 → 이미지 업로드 → **🔍 이미지로 프롬프트 추출** 클릭.
정상 동작하면 프롬프트가 자동 입력 + 변수 추출까지 됩니다.

---

## B안. Supabase CLI 로 배포 (개발자용)

```bash
# 한 번만: CLI 설치 + 로그인 + 프로젝트 연결
npm install -g supabase
supabase login
supabase link --project-ref xaxbkdnrzsghsabkdvzj

# Secret 등록
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...

# 함수 배포
supabase functions deploy extract-prompt
```

---

## 비용 / 보안 주의
- 호출 1회당 Anthropic API 비용 (Sonnet 4 기준 이미지 1장 + 1000 토큰 ≈ 약 $0.005~0.02 정도)
- API 키는 **Supabase Secret** 안에만 저장됨. 프론트 코드/GitHub 저장소에 노출되지 않음
- Edge Function 의 `Access-Control-Allow-Origin: *` 설정 — 누구든 함수를 호출 가능
  → 키 자체는 안전하지만, 함수 호출은 누가나 가능. 비용 폭주 우려 시 함수 코드에 도메인 화이트리스트 추가 가능 (필요하면 알려주세요)

## 디버깅
함수 로그: https://supabase.com/dashboard/project/xaxbkdnrzsghsabkdvzj/functions/extract-prompt/logs
