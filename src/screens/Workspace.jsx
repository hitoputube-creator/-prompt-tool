import { useState, useRef, useEffect } from 'react'
import {
  createTemplate,
  updateTemplate,
  uploadImage,
  extractPromptFromImage,
} from '../lib/supabase.js'

// {{변수}} 또는 [변수] 두 형식 모두 감지
const VAR_PATTERN = /\{\{\s*([^{}\n]+?)\s*\}\}|\[\s*([\w가-힣ㄱ-ㅎㅏ-ㅣ \-]{1,30}?)\s*\]/g

function extractVariables(text) {
  if (!text) return []
  const seen = new Set()
  const list = []
  VAR_PATTERN.lastIndex = 0
  let m
  while ((m = VAR_PATTERN.exec(text)) !== null) {
    const name = (m[1] ?? m[2] ?? '').trim()
    if (!name) continue
    if (!seen.has(name)) {
      seen.add(name)
      list.push(name)
    }
  }
  return list
}

function applyVariables(template, values) {
  if (!template) return ''
  return template.replace(VAR_PATTERN, (match, g1, g2) => {
    const name = (g1 ?? g2 ?? '').trim()
    const v = values[name]
    return v && v.length > 0 ? v : match
  })
}

const SAMPLE_TEMPLATE = `[피곤하지만 귀여운 직장인]이 [아침 햇살이 들어오는 카페]에 앉아 있습니다.
스타일: [픽사 3D 애니메이션], 분위기: [따뜻하고 잔잔한].
메인 컬러는 [부드러운 베이지와 카페라떼 톤], 배경은 [흐릿한 보케 처리된 창가].
1:1 정사각형, 고해상도, 부드러운 조명.`

export default function Workspace({ template, onBack }) {
  const isEditing = !!template?.id

  const [templateText, setTemplateText] = useState(template?.prompt || '')
  const [variables, setVariables] = useState([])
  const [values, setValues] = useState({})
  const [finalText, setFinalText] = useState('')
  const [finalEdited, setFinalEdited] = useState(false)

  // 이미지: imageUrl 은 미리보기/저장된 URL, imageFile 은 새로 업로드할 File
  const [imageUrl, setImageUrl] = useState(template?.image_url || '')
  const [imageFile, setImageFile] = useState(null)

  const [copied, setCopied] = useState(false)

  // 이미지 → 프롬프트 추출
  const [extracting, setExtracting] = useState(false)

  // 저장 모달
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [saveTitle, setSaveTitle] = useState(template?.title || '')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const fileInputRef = useRef(null)

  // 템플릿 텍스트 / 값 변경 시 결과 자동 반영 (단, 사용자가 결과를 직접 편집 중이면 멈춤)
  useEffect(() => {
    if (!finalEdited) {
      setFinalText(applyVariables(templateText, values))
    }
  }, [templateText, values, finalEdited])

  function handleExtract() {
    const found = extractVariables(templateText)
    setVariables(found)
    setValues((prev) => {
      const next = { ...prev }
      for (const name of found) {
        if (!(name in next)) next[name] = name // 괄호 안 텍스트가 기본값
      }
      return next
    })
    setFinalEdited(false)
  }

  function handleValueChange(name, val) {
    setValues((prev) => ({ ...prev, [name]: val }))
    setFinalEdited(false)
  }

  function handleFinalChange(e) {
    setFinalText(e.target.value)
    setFinalEdited(true)
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(finalText)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = finalText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleResetWork() {
    // 변수 입력 + 결과만 리셋 (템플릿/이미지는 유지)
    setVariables([])
    setValues({})
    setFinalText('')
    setFinalEdited(false)
  }

  function handleLoadSample() {
    setTemplateText(SAMPLE_TEMPLATE)
    setVariables([])
    setValues({})
    setFinalEdited(false)
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setImageUrl(ev.target?.result || '')
    reader.readAsDataURL(file)
  }

  function handleImageClear() {
    setImageUrl('')
    setImageFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleExtractFromImage() {
    if (!imageFile && !imageUrl) {
      alert('먼저 이미지를 업로드해주세요')
      return
    }
    setExtracting(true)
    try {
      // 새로 업로드한 파일이 있으면 그걸 우선, 없으면 기존 URL 사용
      const source = imageFile || imageUrl
      const prompt = await extractPromptFromImage(source)
      setTemplateText(prompt)

      // 자동으로 변수 추출까지 실행
      const found = extractVariables(prompt)
      setVariables(found)
      setValues((prev) => {
        const next = { ...prev }
        for (const name of found) {
          if (!(name in next)) next[name] = name
        }
        return next
      })
      setFinalEdited(false)
    } catch (e) {
      alert('이미지 분석 실패: ' + (e?.message || ''))
    } finally {
      setExtracting(false)
    }
  }

  function openSaveModal() {
    setSaveTitle(template?.title || '')
    setSaveError('')
    setShowSaveModal(true)
  }

  function closeSaveModal() {
    if (saving) return
    setShowSaveModal(false)
  }

  async function handleConfirmSave() {
    const title = saveTitle.trim()
    if (!title) {
      setSaveError('제목을 입력해주세요')
      return
    }
    if (!templateText.trim()) {
      setSaveError('프롬프트 템플릿이 비어 있어요')
      return
    }

    setSaving(true)
    setSaveError('')
    try {
      // 새 이미지 파일이 있으면 업로드 → URL 획득
      let finalImageUrl = imageUrl
      if (imageFile) {
        finalImageUrl = await uploadImage(imageFile)
      }

      if (isEditing) {
        await updateTemplate(template.id, {
          title,
          prompt: templateText,
          image_url: finalImageUrl || null,
        })
      } else {
        await createTemplate({
          title,
          prompt: templateText,
          image_url: finalImageUrl || null,
        })
      }

      setShowSaveModal(false)
      setSavedFlash(true)
      setImageFile(null)
      setImageUrl(finalImageUrl || '')
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (e) {
      setSaveError(e?.message || '저장 실패')
    } finally {
      setSaving(false)
    }
  }

  const variableCount = variables.length

  return (
    <div className="page">
      <header className="header">
        <div className="logo">
          <button className="back-btn" onClick={onBack} title="라이브러리로">
            ←
          </button>
          <div>
            <h1>{isEditing ? template.title : '새 템플릿'}</h1>
            <div className="sub">
              {isEditing ? '템플릿 편집 중' : '프롬프트 작성 후 [저장]을 눌러 라이브러리에 추가하세요'}
            </div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn ghost" onClick={handleLoadSample}>샘플 불러오기</button>
          <button className="btn gold" onClick={openSaveModal}>저장</button>
        </div>
      </header>

      {savedFlash && (
        <div className="flash-toast">저장됐습니다!</div>
      )}

      <main className="grid">
        {/* 좌측: 샘플 이미지 */}
        <section className="panel image-panel">
          <h2 className="panel-title">샘플 이미지</h2>

          <div className="image-frame">
            {imageUrl ? (
              <img src={imageUrl} alt="프롬프트 결과 예시" />
            ) : (
              <div className="image-empty">
                <div className="empty-icon">🖼️</div>
                <div className="empty-text">결과 예시 이미지를 업로드하세요</div>
                <div className="empty-hint">JPG / PNG</div>
              </div>
            )}
          </div>

          <div className="image-actions">
            <label className="btn gold compact">
              이미지 업로드
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                hidden
              />
            </label>
            {imageUrl && (
              <button className="btn ghost compact" onClick={handleImageClear}>
                이미지 제거
              </button>
            )}
          </div>

          <button
            className="btn outline extract-btn"
            onClick={handleExtractFromImage}
            disabled={extracting || (!imageFile && !imageUrl)}
            title={!imageFile && !imageUrl ? '먼저 이미지를 업로드하세요' : ''}
          >
            {extracting ? (
              <>
                <span className="spinner" />
                이미지 분석 중...
              </>
            ) : (
              <>🔍 이미지로 프롬프트 추출</>
            )}
          </button>
        </section>

        {/* 중앙: 변수 입력 */}
        <section className="panel input-panel">
          <h2 className="panel-title">
            프롬프트 템플릿
            <span className="title-hint">{`{{변수}} 또는 [변수] 형식 자동 감지`}</span>
          </h2>

          <textarea
            className="template-input"
            placeholder={'예) [피곤하지만 귀여운 직장인]이 [아침 햇살이 드는 카페]에 앉아 있습니다.'}
            value={templateText}
            onChange={(e) => setTemplateText(e.target.value)}
            spellCheck={false}
          />

          <div className="row-between">
            <button className="btn gold" onClick={handleExtract}>
              변수 추출 {variableCount > 0 && <span className="badge">{variableCount}</span>}
            </button>
            <span className="muted small">
              {variableCount > 0
                ? `${variableCount}개 변수 감지됨`
                : '버튼을 누르면 변수가 추출됩니다'}
            </span>
          </div>

          {variableCount > 0 && (
            <div className="var-list">
              {variables.map((name) => (
                <label className="var-row" key={name}>
                  <span className="var-name">{name}</span>
                  <input
                    type="text"
                    placeholder={`${name} 값 입력`}
                    value={values[name] ?? ''}
                    onChange={(e) => handleValueChange(name, e.target.value)}
                  />
                </label>
              ))}
            </div>
          )}
        </section>
      </main>

      <section className="panel result-panel">
        <h2 className="panel-title">
          완성된 프롬프트
          <span className="title-hint">직접 편집 가능</span>
        </h2>

        <textarea
          className="result-output"
          value={finalText}
          onChange={handleFinalChange}
          placeholder="변수를 입력하면 여기에 완성된 프롬프트가 표시됩니다."
          spellCheck={false}
        />

        <div className="result-actions">
          <button
            className={`btn gold ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            disabled={!finalText}
          >
            {copied ? '복사됨!' : '전체 복사'}
          </button>
          <button className="btn ghost" onClick={handleResetWork}>
            입력값 초기화
          </button>
        </div>
      </section>

      <footer className="footer">
        © 스마일 소장 · 하이탑부동산 · Prompt Tool
      </footer>

      {showSaveModal && (
        <SaveModal
          title={saveTitle}
          isEditing={isEditing}
          saving={saving}
          error={saveError}
          onChange={setSaveTitle}
          onCancel={closeSaveModal}
          onConfirm={handleConfirmSave}
        />
      )}
    </div>
  )
}

function SaveModal({ title, isEditing, saving, error, onChange, onCancel, onConfirm }) {
  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onConfirm()
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{isEditing ? '템플릿 수정 저장' : '새 템플릿 저장'}</h3>
        <label className="modal-label">제목</label>
        <input
          autoFocus
          className="modal-input"
          value={title}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="예) 카페 직장인 일러스트"
          maxLength={80}
          disabled={saving}
        />
        {error && <div className="modal-error">{error}</div>}
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel} disabled={saving}>
            취소
          </button>
          <button className="btn gold" onClick={onConfirm} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
