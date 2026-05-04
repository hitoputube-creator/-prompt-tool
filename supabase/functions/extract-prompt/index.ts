// 이미지를 받아 Claude API로 보내고, 프롬프트(텍스트)를 돌려주는 Edge Function.
// 배포: Supabase Dashboard → Edge Functions → New function → name: extract-prompt
// Secret 등록 필요: ANTHROPIC_API_KEY

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 1000

const SYSTEM_PROMPT = `당신은 이미지를 보고 그 이미지를 만든 프롬프트를 역으로 추출하는 전문가입니다.
이미지를 분석해서 이 이미지를 생성할 수 있는 프롬프트를 작성해주세요.

규칙:
1. 바꿀 수 있는 부분은 반드시 [변수명] 형식으로 감싸서 작성
   예: [도시명], [콘텐츠 종류], [포인트 컬러], [주인공 설명]
2. 변수명은 한국어로 직관적으로 작성
3. 스타일, 구도, 색상, 텍스트 구성, 레이아웃을 모두 포함
4. 바로 복사해서 ChatGPT/Claude/미드저니에 쓸 수 있는 완성형으로 작성
5. 프롬프트만 출력. 설명이나 부연 없이.`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }
  if (!ANTHROPIC_API_KEY) {
    return json({ error: 'ANTHROPIC_API_KEY secret is not set on the server' }, 500)
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const { image_base64, media_type } = body || {}
  if (!image_base64 || !media_type) {
    return json({ error: 'image_base64 and media_type are required' }, 400)
  }
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!allowedTypes.includes(media_type)) {
    return json({ error: `Unsupported media_type: ${media_type}` }, 400)
  }

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type,
                  data: image_base64,
                },
              },
              {
                type: 'text',
                text:
                  '이 이미지에 대한 프롬프트를 위 규칙에 따라 작성해주세요. 프롬프트만 출력.',
              },
            ],
          },
        ],
      }),
    })

    const text = await r.text()
    if (!r.ok) {
      return json({ error: `Claude API error: ${r.status} ${text}` }, r.status)
    }

    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return json({ error: 'Invalid response from Claude' }, 502)
    }

    const block = Array.isArray(data?.content)
      ? data.content.find((c: any) => c?.type === 'text')
      : null
    const prompt = (block?.text || '').trim()

    if (!prompt) {
      return json({ error: 'Empty prompt returned' }, 502)
    }
    return json({ prompt })
  } catch (e) {
    return json({ error: (e as Error)?.message || 'Unknown error' }, 500)
  }
})
