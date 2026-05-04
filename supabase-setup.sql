-- ============================================================
-- 스마일 소장의 프롬프트 툴 — Supabase 초기 셋업
-- 기존 하이탑부동산 Supabase 프로젝트(xaxbkdnrzsghsabkdvzj)에서
-- 한 번만 실행하면 됩니다.
-- 실행 위치: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) 템플릿 테이블
CREATE TABLE IF NOT EXISTS public.prompt_templates (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT         NOT NULL,
  prompt      TEXT         NOT NULL,
  image_url   TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS prompt_templates_created_at_idx
  ON public.prompt_templates (created_at DESC);

-- 2) RLS (로그인 없이 익명으로 사용하는 앱이라 모든 anon 접근 허용)
ALTER TABLE public.prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_prompt_templates" ON public.prompt_templates;
CREATE POLICY "anon_select_prompt_templates"
  ON public.prompt_templates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "anon_insert_prompt_templates" ON public.prompt_templates;
CREATE POLICY "anon_insert_prompt_templates"
  ON public.prompt_templates FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_prompt_templates" ON public.prompt_templates;
CREATE POLICY "anon_update_prompt_templates"
  ON public.prompt_templates FOR UPDATE
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_prompt_templates" ON public.prompt_templates;
CREATE POLICY "anon_delete_prompt_templates"
  ON public.prompt_templates FOR DELETE
  USING (true);

-- 3) Storage 버킷 (이미지 보관)
INSERT INTO storage.buckets (id, name, public)
VALUES ('prompt-images', 'prompt-images', true)
ON CONFLICT (id) DO NOTHING;

-- 4) Storage 버킷 정책
DROP POLICY IF EXISTS "anon_read_prompt_images" ON storage.objects;
CREATE POLICY "anon_read_prompt_images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'prompt-images');

DROP POLICY IF EXISTS "anon_upload_prompt_images" ON storage.objects;
CREATE POLICY "anon_upload_prompt_images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'prompt-images');

DROP POLICY IF EXISTS "anon_delete_prompt_images" ON storage.objects;
CREATE POLICY "anon_delete_prompt_images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'prompt-images');

DROP POLICY IF EXISTS "anon_update_prompt_images" ON storage.objects;
CREATE POLICY "anon_update_prompt_images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'prompt-images') WITH CHECK (bucket_id = 'prompt-images');

-- 끝. 정상 실행되면 prompt_templates 테이블과 prompt-images 버킷이 만들어집니다.
