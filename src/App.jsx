import { useEffect, useRef, useState } from 'react'
import './App.css'
import { URL } from './constants'

function App() {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState([])
  const [recentHistory, setRecentHistory] = useState(() => {
    const saved = localStorage.getItem('history')
    return saved ? JSON.parse(saved) : []
  })
  const [selectedHistory, setSelectedHistory] = useState('')
  const scrollToAns = useRef()
  const [loader, setLoader] = useState(false)
  const bottomRef = useRef(null)
  const [darkMode, setDarkMode] = useState('dark')

  // Clean Gemini markdown into plain readable lines
  const parseGeminiResponse = (rawText) => {
    return rawText
      .split('\n')
      .map(line => 
        line
          .replace(/^#{1,6}\s+/, '')   // remove heading markers only at line START
          .replace(/\*\*/g, '')         // remove bold **
          .replace(/^\*+\s*/, '')       // remove leading bullet *
          .replace(/^-{3,}$/, '')       // remove standalone --- lines
          .trim()
      )
      .filter(line => line.length > 0) // drop empty lines
  }

  const askQuestion = async (forcedPayload = null) => {
    const currentPayloadData = forcedPayload || question || selectedHistory

    if (!currentPayloadData.trim()) return false

    if (question && !forcedPayload) {
      const savedHistory = localStorage.getItem('history')
      let history = savedHistory ? JSON.parse(savedHistory) : []
      if (!history.includes(question)) {
        history = [question, ...history]
        localStorage.setItem('history', JSON.stringify(history))
        setRecentHistory(history)
      }
    }

    const payload = {
      contents: [{ parts: [{ text: currentPayloadData }] }]
    }

    setLoader(true)
    try {
      let response = await fetch(URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error(`Server returned status ${response.status}`)

      response = await response.json()

      if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const rawText = response.candidates[0].content.parts[0].text
        const lines = parseGeminiResponse(rawText)

        setResult(prev => [
          ...prev,
          { type: 'q', text: currentPayloadData },
          { type: 'a', text: lines }
        ])
      } else {
        throw new Error('Invalid API response format')
      }
    } catch (error) {
      console.error('API Fetch Error:', error)
      setResult(prev => [
        ...prev,
        { type: 'q', text: currentPayloadData },
        { type: 'a', text: ['⚠️ The AI service is currently busy or unavailable. Please try again.'] }
      ])
    } finally {
      setQuestion('')
      setLoader(false)
    }
  }

  const clearHistory = () => {
    localStorage.removeItem('history')
    setRecentHistory([])
  }

  const isEnter = (event) => {
    if (event.key === 'Enter') askQuestion()
  }

  useEffect(() => {
    if (selectedHistory) askQuestion(selectedHistory)
  }, [selectedHistory])

  useEffect(() => {
    if (darkMode === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [result])

  return (
    <div className={darkMode === 'dark' ? 'dark' : 'light'}>
      <div className="flex h-screen overflow-hidden dark:bg-zinc-900 bg-gray-50">

        {/* ── Sidebar ── */}
        <aside className="w-64 shrink-0 flex flex-col dark:bg-zinc-800 bg-white border-r dark:border-zinc-700 border-gray-200">
          <div className="flex items-center justify-between px-4 py-4 border-b dark:border-zinc-700 border-gray-200">
            <h2 className="text-sm font-semibold dark:text-zinc-200 text-zinc-700 tracking-wide uppercase">
              History
            </h2>
            <button
              onClick={clearHistory}
              title="Clear history"
              className="p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="#9ca3af">
                <path d="M312-144q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480ZM384-288h72v-336h-72v336Zm120 0h72v-336h-72v336ZM312-696v480-480Z"/>
              </svg>
            </button>
          </div>

          <ul className="flex-1 overflow-y-auto py-2">
            {recentHistory.map((item, index) => (
              <li
                key={`hist-${index}-${item.substring(0, 5)}`}
                onClick={() => setSelectedHistory(item)}
                className="px-4 py-2 text-sm truncate cursor-pointer dark:text-zinc-400 text-zinc-600 dark:hover:bg-zinc-700 hover:bg-gray-100 dark:hover:text-zinc-200 hover:text-zinc-900 transition-colors"
              >
                {item}
              </li>
            ))}
          </ul>

          <div className="px-4 py-3 border-t dark:border-zinc-700 border-gray-200">
            <select
              onChange={(e) => setDarkMode(e.target.value)}
              value={darkMode}
              className="w-full dark:bg-zinc-700 bg-gray-100 dark:text-white text-zinc-800 text-sm px-3 py-1.5 rounded-lg border dark:border-zinc-600 border-gray-300 outline-none cursor-pointer"
            >
              <option value="dark">🌙 Dark</option>
              <option value="light">☀️ Light</option>
            </select>
          </div>
        </aside>

        {/* ── Main Chat Area ── */}
        <main className="flex-1 flex flex-col min-w-0 dark:bg-zinc-900 bg-gray-50">

          <header className="flex items-center justify-center py-4 border-b dark:border-zinc-700 border-gray-200 shrink-0 dark:bg-zinc-900 bg-white">
            <h1 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-violet-500">
              Hello User, Ask me Anything
            </h1>
          </header>

          <div ref={scrollToAns} className="flex-1 overflow-y-auto px-4 py-6">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">

              {result.length === 0 && (
                <div className="flex flex-col items-center justify-center h-64 gap-3 opacity-40">
                  <svg xmlns="http://www.w3.org/2000/svg" height="48px" viewBox="0 -960 960 960" width="48px" fill="currentColor" className="dark:text-zinc-500 text-zinc-400">
                    <path d="M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Z"/>
                  </svg>
                  <p className="text-sm dark:text-zinc-500 text-zinc-500">Ask a question to get started</p>
                </div>
              )}

              {result.map((item, index) => (
                <div
                  key={`res-block-${index}`}
                  className={`flex ${item.type === 'q' ? 'justify-end' : 'justify-start'}`}
                >
                  {item.type === 'q' ? (
                    <div className="max-w-sm px-4 py-2.5 rounded-2xl rounded-br-sm dark:bg-violet-600 bg-violet-500 text-white text-sm shadow-sm">
                      {item.text}
                    </div>
                  ) : (
                    <div className="flex gap-3 max-w-xl w-full">
                      <div className="mt-1 w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        Arijit
                      </div>
                      {/* Render lines directly — no Answers.jsx needed */}
                      <div className="flex flex-col gap-1 text-sm dark:text-zinc-200 text-zinc-800 leading-relaxed">
                        {item.text.map((line, lineIndex) => (
                          <p key={`line-${index}-${lineIndex}`} className="m-0">
                            {line}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loader && (
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-violet-600 shrink-0" />
                  <div className="flex gap-1.5 items-center px-4 py-3 rounded-2xl dark:bg-zinc-800 bg-gray-200">
                    <span className="w-2 h-2 rounded-full dark:bg-zinc-400 bg-zinc-500 animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 rounded-full dark:bg-zinc-400 bg-zinc-500 animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 rounded-full dark:bg-zinc-400 bg-zinc-500 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </div>

          <div className="shrink-0 px-4 py-4 border-t dark:border-zinc-700 border-gray-200 dark:bg-zinc-900 bg-white">
            <div className="max-w-2xl mx-auto flex items-center gap-2 dark:bg-zinc-800 bg-gray-100 rounded-full border dark:border-zinc-600 border-gray-300 px-2 py-1.5 shadow-sm">
              <input
                type="text"
                value={question}
                onKeyDown={isEnter}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent outline-none text-sm dark:text-white text-zinc-800 px-3 dark:placeholder:text-zinc-500 placeholder:text-zinc-400"
              />
              <button
                onClick={() => askQuestion()}
                disabled={loader}
                className="bg-gradient-to-r from-pink-500 to-violet-600 text-white px-5 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Ask
              </button>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

export default App