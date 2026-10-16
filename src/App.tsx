import { useEffect } from 'react'
import { Editor } from './components/Editor'
import { Sidebar } from './components/Sidebar'
import { usePuzzleStore } from './store/usePuzzleStore'
import './styles.css'

export default function App() {
  const init = usePuzzleStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return (
    <div className="app">
      <Sidebar />
      <Editor />
    </div>
  )
}
