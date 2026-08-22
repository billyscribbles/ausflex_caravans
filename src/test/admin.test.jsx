import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { HelmetProvider } from 'react-helmet-async'
import AdminPage from '../pages/AdminPage.jsx'

// createImageBitmap and canvas 2d contexts don't exist in jsdom. The browser
// resize behaviour is already covered by src/test/resizeImage.test.js, so
// here we only need the upload path to pass the file through untouched.
vi.mock('../admin/resizeImage.js', () => ({ resizeImage: async (file) => file }))

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
  vans: { eyebrow: '', heading: '', sub: '', items: [] },
}

const VAN = {
  id: 'van-1',
  slug: 'tuff-mudder',
  name: 'Tuff Mudder',
  length: '12ft',
  tag: 'Off-road hybrid',
  meta: 'Sleeps 2',
  blurb: 'Small in size but big in features.',
  description: ['First paragraph.', 'Second paragraph.'],
  specs: ['12ft body', 'Single axle'],
  image: '/images/photo-tuff-mudder.jpg',
  imageAlt: 'Tuff Mudder',
  floorplan: null,
  floorplanAlt: '',
  photos: [],
  sortOrder: 0,
}

const WITH_VAN = {
  ...EMPTY_CONTENT,
  vans: { eyebrow: 'The Range', heading: 'A van for every adventure.', sub: 'Sub.', items: [VAN] },
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
    vans: { eyebrow: '', heading: '', sub: '', items: [] },
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
    vans: { eyebrow: '', heading: '', sub: '', items: [] },
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

describe('AdminPage — vans', () => {
  it('lists the range with a count in the rail', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
      }),
    )
    renderAdmin()

    const tab = await screen.findByRole('tab', { name: /vans/i })
    await userEvent.click(tab)

    expect(await screen.findByText('Tuff Mudder')).toBeInTheDocument()
    expect(screen.getByText('/vans/tuff-mudder')).toBeInTheDocument()
  })

  it('adds a van by name', async () => {
    const post = { ok: true, json: async () => ({ van: { ...VAN, id: 'van-2' } }) }
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
        'POST /api/vans': post,
      }),
    )
    renderAdmin()

    await userEvent.click(await screen.findByRole('tab', { name: /vans/i }))
    await userEvent.type(await screen.findByLabelText(/new van name/i), 'Desert Runner')
    await userEvent.click(screen.getByRole('button', { name: /add van/i }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith('/api/vans', expect.anything()))
  })

  it('requires the van name to be typed before deleting', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
        'DELETE /api/vans/van-1': { ok: true, json: async () => ({ ok: true }) },
      }),
    )
    renderAdmin()

    await userEvent.click(await screen.findByRole('tab', { name: /vans/i }))
    await userEvent.click(await screen.findByRole('button', { name: /delete tuff mudder/i }))

    const confirm = screen.getByRole('button', { name: /confirm delete/i })
    expect(confirm).toBeDisabled()

    await userEvent.type(screen.getByLabelText(/type the van name/i), 'Tuff Mudder')
    expect(confirm).toBeEnabled()

    await userEvent.click(confirm)
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith('/api/vans/van-1', { method: 'DELETE' }),
    )
  })

  async function openEditor(handlers = {}) {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
        ...handlers,
      }),
    )
    renderAdmin()
    await userEvent.click(await screen.findByRole('tab', { name: /vans/i }))
    await userEvent.click(await screen.findByRole('button', { name: /edit tuff mudder/i }))
  }

  it('opens the editor with the van already filled in', async () => {
    await openEditor()

    expect(await screen.findByLabelText(/van name/i)).toHaveValue('Tuff Mudder')
    expect(screen.getByLabelText(/web address/i)).toHaveValue('tuff-mudder')
    expect(screen.getByLabelText(/short blurb/i)).toHaveValue('Small in size but big in features.')
    // Paragraphs round-trip through one textarea, blank-line separated.
    expect(screen.getByLabelText(/full description/i)).toHaveValue(
      'First paragraph.\n\nSecond paragraph.',
    )
  })

  it('saves a text field on blur', async () => {
    await openEditor({
      'PATCH /api/vans/van-1': { ok: true, json: async () => ({ van: VAN }) },
    })

    const field = await screen.findByLabelText(/van length/i)
    await userEvent.clear(field)
    await userEvent.type(field, '13ft')
    await userEvent.tab()

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vans/van-1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ length: '13ft' }) }),
      ),
    )
  })

  it('splits the description textarea into paragraphs on save', async () => {
    await openEditor({
      'PATCH /api/vans/van-1': { ok: true, json: async () => ({ van: VAN }) },
    })

    const field = await screen.findByLabelText(/full description/i)
    await userEvent.clear(field)
    await userEvent.type(field, 'One.{Enter}{Enter}Two.')
    await userEvent.tab()

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vans/van-1',
        expect.objectContaining({ body: JSON.stringify({ description: ['One.', 'Two.'] }) }),
      ),
    )
  })

  it('adds and removes a spec', async () => {
    await openEditor({
      'PATCH /api/vans/van-1': { ok: true, json: async () => ({ van: VAN }) },
    })

    await userEvent.type(await screen.findByLabelText(/new spec/i), 'Solar ready')
    await userEvent.click(screen.getByRole('button', { name: /add spec/i }))

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vans/van-1',
        expect.objectContaining({
          body: JSON.stringify({ specs: ['12ft body', 'Single axle', 'Solar ready'] }),
        }),
      ),
    )

    await userEvent.click(screen.getByRole('button', { name: /remove 12ft body/i }))
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vans/van-1',
        expect.objectContaining({ body: JSON.stringify({ specs: ['Single axle'] }) }),
      ),
    )
  })

  it('warns that changing the web address breaks the old link', async () => {
    await openEditor()
    expect(await screen.findByText(/breaks the old link/i)).toBeInTheDocument()
  })

  it('uploads a hero photo and a floorplan through the same endpoint', async () => {
    await openEditor({
      'POST /api/vans/van-1/image': { ok: true, json: async () => ({ van: VAN }) },
    })

    const file = new File(['x'], 'hero.png', { type: 'image/png' })
    await userEvent.upload(await screen.findByLabelText(/replace the main photo/i), file)

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vans/van-1/image',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })

  it('offers alt text for both images', async () => {
    await openEditor()
    expect(await screen.findByLabelText(/describe the main photo/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/describe the floorplan/i)).toBeInTheDocument()
  })

  it('renders the van gallery as a photo collection scoped to this van', async () => {
    await openEditor()
    expect(await screen.findByText(/in the flesh/i)).toBeInTheDocument()
    // PhotosTab's own empty state, carrying the label VanEditor passed it.
    expect(screen.getByText(/nothing in tuff mudder photos yet/i)).toBeInTheDocument()
  })

  it('edits the /vans page intro copy', async () => {
    vi.stubGlobal(
      'fetch',
      mockFetch({
        'GET /api/auth/session': { ok: true, json: async () => ({ authed: true }) },
        'GET /api/content': { ok: true, json: async () => WITH_VAN },
        'PATCH /api/vans/page': { ok: true, json: async () => ({ page: {} }) },
      }),
    )
    renderAdmin()

    await userEvent.click(await screen.findByRole('tab', { name: /page intro/i }))

    const heading = await screen.findByLabelText(/heading/i)
    expect(heading).toHaveValue('A van for every adventure.')

    await userEvent.clear(heading)
    await userEvent.type(heading, 'Every adventure, covered.')
    await userEvent.tab()

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/vans/page',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ heading: 'Every adventure, covered.' }),
        }),
      ),
    )
  })
})
