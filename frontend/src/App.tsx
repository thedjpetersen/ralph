import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useAccountStore } from './stores/account'

function App() {
  const [count, setCount] = useState(0)
  const { currentAccount, accounts, isLoading, error, fetchAccounts, switchAccount } = useAccountStore()
  const [isAuthenticated] = useState(true) // Placeholder for auth state

  // Initialize account store after authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchAccounts()
    }
  }, [isAuthenticated, fetchAccounts])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      {/* Account selector */}
      <div className="card">
        <h3>Account</h3>
        {isLoading && <p>Loading accounts...</p>}
        {error && <p style={{ color: 'red' }}>Error: {error}</p>}
        {currentAccount && (
          <p>Current: {currentAccount.name} ({currentAccount.email})</p>
        )}
        {accounts.length > 1 && (
          <select
            value={currentAccount?.id || ''}
            onChange={(e) => switchAccount(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
