import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', textAlign: 'center', backgroundColor: '#0f172a', color: '#f8fafc', minHeight: '100vh' }}>
      <h1>⚡ VibeCode React Starter</h1>
      <p>Welcome to your interactive in-browser coding playground!</p>
      <div style={{ marginTop: '2rem' }}>
        <button 
          onClick={() => setCount((c) => c + 1)}
          style={{ padding: '0.75rem 1.5rem', fontSize: '1rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer' }}
        >
          Count is {count}
        </button>
      </div>
    </div>
  )
}
