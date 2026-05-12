import { useEffect, useMemo, useState } from 'react'
import { listTemplates, deleteTemplate } from '../lib/supabase.js'

const PAGE_SIZE = 12

export default function Library({ onOpen, onCreate }) {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const list = await listTemplates()
      setTemplates(list)
      setPage(1)
    } catch (e) {
      setError(e?.message || '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalPages = Math.max(1, Math.ceil(templates.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return templates.slice(start, start + PAGE_SIZE)
  }, [templates, currentPage])

  async function handleDelete(t, e) {
    e.stopPropagation()
    if (!window.confirm(`"${t.title}" 정말 삭제할까요?`)) return
    try {
      await deleteTemplate(t.id, t.image_url)
      setTemplates((prev) => {
        const next = prev.filter((x) => x.id !== t.id)
        const newTotal = Math.max(1, Math.ceil(next.length / PAGE_SIZE))
        if (page > newTotal) setPage(newTotal)
        return next
      })
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
        <>
          <div className="card-grid">
            {pageItems.map((t) => (
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
          {totalPages > 1 && (
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onChange={setPage}
            />
          )}
        </>
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

function Pagination({ page, totalPages, onChange }) {
  const pages = getPageNumbers(page, totalPages)
  return (
    <nav className="pagination" aria-label="페이지 이동">
      <button
        className="page-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전 페이지"
      >
        ‹
      </button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`gap-${i}`} className="page-gap">…</span>
        ) : (
          <button
            key={p}
            className={'page-btn' + (p === page ? ' active' : '')}
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
      <button
        className="page-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </nav>
  )
}

function getPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push('...')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('...')
  pages.push(total)
  return pages
}
