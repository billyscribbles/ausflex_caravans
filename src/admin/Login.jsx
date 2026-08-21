import { useState } from 'react'
import { login } from './api.js'

export default function Login({ onSuccess }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="admin-login" onSubmit={onSubmit}>
      <h1 className="admin-login__title">Ausflex admin</h1>

      <label className="admin-field" htmlFor="admin-password">
        Password
      </label>
      <input
        id="admin-password"
        className="admin-input"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      <button className="admin-button" type="submit" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
