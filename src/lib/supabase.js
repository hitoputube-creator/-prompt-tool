import { createClient } from '@supabase/supabase-js'

// 기존 하이탑부동산 Supabase 프로젝트와 동일
const SUPABASE_URL = 'https://xaxbkdnrzsghsabkdvzj.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhheGJrZG5yenNnaHNhYmtkdnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjc5NTIsImV4cCI6MjA4OTY0Mzk1Mn0.l27ZYQHLt48p7EQrZ8gbAOmJHvCfIur84CtgoWlA8Wg'

const BUCKET = 'prompt-images'
const TABLE = 'prompt_templates'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── 템플릿 CRUD ────────────────────────────────────────────────
export async function listTemplates() {
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, title, prompt, image_url, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createTemplate({ title, prompt, image_url }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ title, prompt, image_url })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTemplate(id, patch) {
  const { data, error } = await supabase
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteTemplate(id, image_url) {
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) throw error
  // 이미지 파일도 best-effort로 같이 삭제 (실패해도 무시)
  if (image_url) {
    const path = extractStoragePath(image_url)
    if (path) {
      try {
        await supabase.storage.from(BUCKET).remove([path])
      } catch (e) {
        console.warn('storage remove failed:', e)
      }
    }
  }
}

// ── 이미지 업로드 ──────────────────────────────────────────────
export async function uploadImage(file) {
  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  })
  if (error) throw error
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

function extractStoragePath(url) {
  // public URL: https://<proj>.supabase.co/storage/v1/object/public/<bucket>/<path>
  const m = url.match(/\/object\/public\/[^/]+\/(.+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

// ── 이미지 → 프롬프트 추출 (Edge Function 호출) ────────────────
export async function extractPromptFromImage(source) {
  // source: File | Blob | string(URL/dataURL)
  let blob
  if (source instanceof File || source instanceof Blob) {
    blob = source
  } else if (typeof source === 'string') {
    const r = await fetch(source)
    if (!r.ok) throw new Error('이미지를 불러오지 못했습니다')
    blob = await r.blob()
  } else {
    throw new Error('이미지 소스가 잘못되었습니다')
  }

  const media_type = blob.type || 'image/jpeg'
  const image_base64 = await blobToBase64(blob)

  const { data, error } = await supabase.functions.invoke('extract-prompt', {
    body: { image_base64, media_type },
  })
  if (error) throw new Error(error.message || '함수 호출 실패')
  if (data?.error) throw new Error(data.error)
  if (!data?.prompt) throw new Error('빈 응답을 받았습니다')
  return data.prompt
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result || ''
      const idx = String(result).indexOf(',')
      resolve(idx >= 0 ? String(result).slice(idx + 1) : String(result))
    }
    reader.onerror = () => reject(new Error('이미지 변환 실패'))
    reader.readAsDataURL(blob)
  })
}
