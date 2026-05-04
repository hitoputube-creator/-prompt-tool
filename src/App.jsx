import { useState } from 'react'
import Library from './screens/Library.jsx'
import Workspace from './screens/Workspace.jsx'

export default function App() {
  const [screen, setScreen] = useState('library') // 'library' | 'workspace'
  const [editing, setEditing] = useState(null)    // 작업 중인 템플릿 (null = 새 템플릿)

  function goLibrary() {
    setEditing(null)
    setScreen('library')
  }

  function openTemplate(t) {
    setEditing(t)
    setScreen('workspace')
  }

  function createNew() {
    setEditing(null)
    setScreen('workspace')
  }

  return screen === 'library' ? (
    <Library onOpen={openTemplate} onCreate={createNew} />
  ) : (
    <Workspace template={editing} onBack={goLibrary} />
  )
}
