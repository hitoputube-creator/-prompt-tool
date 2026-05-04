import { useEffect, useState } from 'react'
import { listTemplates, deleteTemplate } from '../lib/supabase.js'

export default function Library({ onOpen, onCreate }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await listTemplates()
      setTemplates(list)
    } catch (e) {
      setError(e?.message || '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleDelete(t, e) {
    e.stopPropagation()
    if (!window.confirm(`"${t.title}" 정말 삭제할까요?`)) return
    try {
      await deleteTemplate(t.id, t.image_url)
      setTemplates((prev) => prev.filter((x) => x.id !== t.id))
    } catch (err) {
      alert('삭제 실패: ' + (err?.message || ''))
    }
  }

  return (
    <div className="page">
      <header className="header">
        <div className="logo">
          <div className="logo-mark">P</div>
          <div>
            <h1>스마일 소장의 프롬프트 툴</h1>
            <div className="sub">저장된 템플릿 라이브러리</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="btn gold" onClick={onCreate}>+ 새 템플릿 추가</button>
        </div>
      </header>

      {loading ? (
        <div className="empty-state">
          <div className="empty-title">불러오는 중...</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-icon-lg">⚠️</div>
          <div className="empty-title">불러오기 실패</div>
          <div className="empty-sub">{error}</div>
          <button className="btn ghost" style={{ marginTop: 12 }} onClick={load}>다시 시도</button>
        </div>
      ) : templates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-lg">📭</div>
          <div className="empty-title">저장된 템플릿이 없습니다</div>
          <div className="empty-sub">우측 상단 [+ 새 템플릿 추가] 버튼으로 시작해보세요</div>
        </div>
      ) : (
        <div className="card-grid">
          {templates.map((t) => (
            <div key={t.id} className="card" onClick={() => onOpen(t)}>
              <button
                className="card-delete"
                onClick={(e) => handleDelete(t, e)}
                title="삭제"
                aria-label="삭제"
              >
                ×
              </button>
              <div className="card-image">
                {t.image_url ? (
                  <img src={t.image_url} alt={t.title} loading="lazy" />
                ) : (
                  <div className="card-image-empty">🖼️</div>
                )}
              </div>
              <div className="card-body">
                <div className="card-title" title={t.title}>{t.title}</div>
                <div className="card-date">{formatDate(t.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <footer className="footer">
        © 스마일 소장 · 하이탑부동산 · Prompt Tool
      </footer>
    </div>
  )
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}.${m}.${day}`
}
