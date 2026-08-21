import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { HelmetProvider } from 'react-helmet-async'
import AdminPage from '../pages/AdminPage.jsx'

expect.extend(toHaveNoViolations)

function renderAdmin() {
  return render(
    <HelmetProvider>
      <AdminPage />
    </HelmetProvider>,
  )
}

const EMPTY_CONTENT = {
  gallery: { interiors: [], exteriors: [], page: [] },
  tours: [],
}

function mockFetch(handlers) {
  return vi.fn(async (url, options = {}) => {
    const key = `${options.method ?? 'GET'} ${url}`
    const handler = handlers[key]
    if (!handler) return { ok: false, status: 404, json: async () => ({ error: 'not mocked' }) }
    return handler
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('AdminPage', () => {
  it('shows the login form when not authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    expect(screen.queryByRole('tab', { name: /photos/i })).not.toBeInTheDocument()
  })

  it('shows the dashboard when already authenticated', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => EMPTY_CONTENT },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument())
    expect(screen.getByRole('tab', { name: /360/i })).toBeInTheDocument()
  })

  it('surfaces a wrong-password error instead of failing silently', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) },
        'POST /api/auth/login': {
          ok: false,
          status: 401,
          json: async () => ({ error: 'incorrect password' }),
        },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/incorrect password/i))
  })

  it('surfaces the rate-limit message', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) },
        'POST /api/auth/login': {
          ok: false,
          status: 429,
          json: async () => ({ error: 'too many attempts, try again in 15 minutes' }),
        },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    await user.type(screen.getByLabelText(/password/i), 'wrong')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/too many attempts/i))
  })

  it('the login screen has no accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({ 'GET /api/auth/session': { ok: true, json: async () => ({ authed: false }) } }),
    )
    const { container } = renderAdmin()
    await waitFor(() => expect(screen.getByLabelText(/password/i)).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })

  it('the dashboard has no accessibility violations', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => EMPTY_CONTENT },
      }),
    )
    const { container } = renderAdmin()
    await waitFor(() => expect(screen.getByRole('tab', { name: /photos/i })).toBeInTheDocument())
    expect(await axe(container)).toHaveNoViolations()
  })
})
