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
    expect(screen.queryByRole('tab', { name: /gallery page/i })).not.toBeInTheDocument()
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

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /gallery page/i })).toBeInTheDocument(),
    )
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
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: /gallery page/i })).toBeInTheDocument(),
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  const ONE_PHOTO = {
    gallery: {
      interiors: [],
      exteriors: [],
      page: [
        {
          id: 'p1',
          collection: 'page',
          src: '/uploads/a.webp',
          alt: 'A van',
          caption: '',
          sortOrder: 0,
        },
      ],
    },
    tours: [],
  }

  it('lists photos for the selected collection with editable alt text', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => ONE_PHOTO },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByDisplayValue('A van')).toBeInTheDocument())
    // One photo is not a multiple of nine, so the mosaic warning shows.
    expect(screen.getByText(/last row will be short/i)).toBeInTheDocument()
  })

  it('requires a second click to delete', async () => {
    const user = userEvent.setup()
    const spy = mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': { ok: true, json: async () => ONE_PHOTO },
    })
    vi.stubGlobal('fetch', spy)
    renderAdmin()

    await waitFor(() => expect(screen.getByDisplayValue('A van')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /delete photo 1/i }))

    // Nothing is destroyed on the first click.
    expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalledWith(
      '/api/photos/p1',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  const TOURS_CONTENT = {
    gallery: { interiors: [], exteriors: [], page: [] },
    tours: [
      {
        id: 't1',
        title: 'Explorer 21',
        embedUrl: 'https://kuula.co/share/a',
        poster: null,
        sortOrder: 0,
      },
      {
        id: 't2',
        title: 'Sea Breeze',
        embedUrl: 'https://kuula.co/share/b',
        poster: null,
        sortOrder: 1,
      },
    ],
  }

  it('lists tours and marks the first as the one on the home page', async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => TOURS_CONTENT },
      }),
    )
    renderAdmin()

    await waitFor(() => expect(screen.getByRole('tab', { name: /360/i })).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /360/i }))

    expect(screen.getByDisplayValue('Explorer 21')).toBeInTheDocument()
    // The home-page rule is visible rather than hidden.
    expect(screen.getByText(/shown on the home page/i)).toBeInTheDocument()
  })

  it('rejects an off-allowlist embed URL before sending it', async () => {
    const user = userEvent.setup()
    const spy = mockFetch({
      'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
      'GET /api/content': { ok: true, json: async () => TOURS_CONTENT },
    })
    vi.stubGlobal('fetch', spy)
    renderAdmin()

    await waitFor(() => expect(screen.getByRole('tab', { name: /360/i })).toBeInTheDocument())
    await user.click(screen.getByRole('tab', { name: /360/i }))

    await user.type(screen.getByLabelText(/new tour name/i), 'Bad tour')
    await user.type(screen.getByLabelText(/new embed url/i), 'https://evil.example.com/x')
    await user.click(screen.getByRole('button', { name: /add tour/i }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/kuula\.co or matterport\.com/i),
    )
    // Refused client-side: no request was ever made.
    expect(spy).not.toHaveBeenCalledWith('/api/tours', expect.anything())
  })
})
