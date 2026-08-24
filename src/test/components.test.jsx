// Contract: components are "dumb" — they render brand strings and links
// straight from site.config, never hardcoded. This proves the wire is live,
// so a config swap is enough to reskin the chrome.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import VirtualTour from '../components/VirtualTour.jsx'
import GalleryGrid from '../components/GalleryGrid.jsx'
import InteriorsRail from '../components/InteriorsRail.jsx'
import { site } from '../config/site.config.js'
import { tour } from '../content/tour.js'
import { vans as staticVans } from '../content/vans.js'

const renderNavbar = () =>
  render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  )

describe('Navbar — renders brand + nav from site.config', () => {
  it('labels the logo with the brand name', () => {
    renderNavbar()
    expect(screen.getByLabelText(site.brand.name)).toBeInTheDocument()
  })

  it('renders every nav item from config', () => {
    renderNavbar()
    for (const item of site.nav) {
      // Each label appears in both the desktop and mobile nav.
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0)
    }
  })

  it('renders the CTA label from config', () => {
    renderNavbar()
    expect(screen.getAllByText(site.cta.label).length).toBeGreaterThan(0)
  })
})

describe('VirtualTour with multiple tours', () => {
  const tours = [
    {
      id: 'a',
      title: 'Explorer 21',
      embedUrl: 'https://kuula.co/share/a',
      poster: '/images/x.jpg',
    },
    { id: 'b', title: 'Sea Breeze', embedUrl: 'https://kuula.co/share/b', poster: '/images/y.jpg' },
  ]

  const renderTour = (props) =>
    render(
      <MemoryRouter>
        <VirtualTour content={tour} {...props} />
      </MemoryRouter>,
    )

  it('gives every tour its own labelled section, with one player mounted', () => {
    renderTour({ tours, full: true })

    for (const t of tours) {
      expect(screen.getByRole('region', { name: t.title })).toBeInTheDocument()
    }
    // Mounting several Kuula players at once would be punishing.
    expect(document.querySelectorAll('iframe').length).toBe(1)
    expect(document.querySelector('iframe').getAttribute('src')).toBe(tours[0].embedUrl)
  })

  it('hands the single player to whichever section is launched', async () => {
    const user = userEvent.setup()
    renderTour({ tours, full: true })

    await user.click(screen.getByRole('button', { name: /Sea Breeze/ }))

    expect(document.querySelectorAll('iframe').length).toBe(1)
    expect(document.querySelector('iframe').getAttribute('src')).toBe(tours[1].embedUrl)
    // The section that gave the player up goes back behind its poster, so it
    // can be launched again rather than being left empty.
    expect(screen.getByRole('button', { name: /Explorer 21/ })).toBeInTheDocument()
  })

  it('names each launch button after its own tour', () => {
    renderTour({ tours, full: true })

    // Every section carries the same launch copy, so without the tour name a
    // screen reader's button list is a row of identical entries.
    expect(screen.getByRole('button', { name: /Sea Breeze/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Explorer 21/ })).not.toBeInTheDocument()
  })

  it('renders one band with no sections and stays behind the poster on home', () => {
    renderTour({ tours })

    expect(screen.queryByRole('region', { name: 'Sea Breeze' })).not.toBeInTheDocument()
    expect(document.querySelectorAll('iframe').length).toBe(0)
    expect(screen.getByRole('heading', { name: tour.heading })).toBeInTheDocument()
  })

  it('sections the content file collections before live tours arrive', () => {
    // No `tours` prop: this is the first paint on /360, before /api/content
    // resolves. The sections have to be complete already, or the page grows
    // another van under the visitor as they scroll.
    renderTour({ full: true })

    for (const item of tour.items) {
      expect(screen.getByRole('region', { name: item.title })).toBeInTheDocument()
    }
    expect(document.querySelectorAll('iframe').length).toBe(1)
    expect(document.querySelector('iframe').getAttribute('src')).toBe(tour.items[0].src)
  })
})

describe('gallery skeletons', () => {
  it('GalleryGrid renders placeholder tiles while loading and no images', () => {
    const { container } = render(
      <GalleryGrid content={{ heading: 'Gallery', items: [] }} loading />,
    )
    expect(container.querySelectorAll('.gallery-grid__tile--skeleton').length).toBeGreaterThan(0)
    expect(container.querySelectorAll('img').length).toBe(0)
  })

  it('GalleryGrid renders real tiles once loading is false', () => {
    const items = [{ id: '1', src: '/uploads/a.webp', alt: 'A van' }]
    const { container } = render(<GalleryGrid content={{ heading: 'Gallery', items }} />)
    expect(container.querySelectorAll('.gallery-grid__tile--skeleton').length).toBe(0)
    expect(container.querySelector('img').getAttribute('src')).toBe('/uploads/a.webp')
  })

  it('renders alt="" for a photo with no alt text rather than inventing one', () => {
    const items = [{ id: '1', src: '/uploads/a.webp', alt: '' }]
    const { container } = render(<GalleryGrid content={{ heading: 'Gallery', items }} />)
    expect(container.querySelector('img').getAttribute('alt')).toBe('')
  })

  it('InteriorsRail renders skeleton cards while loading', () => {
    const { container } = render(
      <InteriorsRail content={{ heading: 'Interiors', items: [] }} loading />,
    )
    expect(container.querySelectorAll('.interiors-rail__card--skeleton').length).toBeGreaterThan(0)
  })
})

// The store fires its fetch at module scope, so each test resets the module
// registry and re-imports — a statically-imported component would still be
// bound to the OLD store instance and would silently ignore the stub. Both
// the store and the component under test must come from the same post-reset
// registry. react-helmet-async is included here for the same reason: VanPage
// renders <Helmet> through SEO, and Helmet keeps its provider context in a
// module-scoped React.createContext() — a HelmetProvider imported statically
// at the top of this file would be a *different* module instance after
// resetModules(), so Helmet would not see its context and would crash.
async function loadWith(response) {
  vi.resetModules()
  // A rejected `response` fixture is constructed before the store's own
  // .then().catch() chain gets to subscribe to it (that only happens once the
  // dynamic imports below finish resolving) — long enough for Node to flag it
  // as an unhandled rejection. Mark it handled now; the store still attaches
  // its own independent handler later.
  Promise.resolve(response).catch(() => {})
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(() => response),
  )
  const [{ default: VanPage }, { default: Range }, { HelmetProvider }] = await Promise.all([
    import('../pages/VanPage.jsx'),
    import('../components/Range.jsx'),
    import('react-helmet-async'),
  ])
  return { VanPage, Range, HelmetProvider }
}

function renderVanPage(VanPage, HelmetProvider, slug) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/vans/${slug}`]}>
        <Routes>
          <Route path="/vans/:slug" element={<VanPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  )
}

afterEach(() => vi.unstubAllGlobals())

const BARE_VAN = {
  id: 'x',
  slug: 'bare-van',
  name: 'Bare Van',
  length: '',
  tag: '',
  meta: '',
  blurb: '',
  description: [],
  specs: [],
  image: null,
  imageAlt: '',
  floorplan: null,
  floorplanAlt: '',
  photos: [],
  sortOrder: 0,
}

describe('VanPage — live content', () => {
  it('holds a loading state instead of flashing a 404 before content arrives', async () => {
    // A promise that never settles: the store stays in `loading` forever.
    const { VanPage, HelmetProvider } = await loadWith(new Promise(() => {}))
    renderVanPage(VanPage, HelmetProvider, 'a-van-created-in-the-dashboard')

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByText(/page not found/i)).not.toBeInTheDocument()
  })

  it('renders a 404 once the range is known and the slug is not in it', async () => {
    const { VanPage, HelmetProvider } = await loadWith(Promise.reject(new Error('offline')))
    renderVanPage(VanPage, HelmetProvider, 'definitely-not-a-van')

    await waitFor(() => expect(screen.getByText(/page not found/i)).toBeInTheDocument())
  })

  it('renders a van with no image or floorplan without a broken img', async () => {
    const bare = {
      gallery: { interiors: [], exteriors: [], page: [] },
      tours: [],
      vans: { eyebrow: 'e', heading: 'h', sub: 's', items: [BARE_VAN] },
    }
    const { VanPage, HelmetProvider } = await loadWith(
      Promise.resolve({ ok: true, json: async () => bare }),
    )
    const { container } = renderVanPage(VanPage, HelmetProvider, 'bare-van')

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Bare Van' })).toBeInTheDocument(),
    )
    // BARE_VAN.imageAlt is '', which gives an <img alt=""> the implicit role
    // presentation/none rather than img — queryAllByRole('img') would never see
    // it either way, so it can't tell a guarded <img> apart from a reintroduced
    // <img src={null}>. Query the DOM directly instead, scoped to the van's own
    // image slots: ContactCTA (rendered on every VanPage) has its own unrelated
    // background <img>, so a page-wide query would pass or fail independent of
    // the guard under test.
    expect(container.querySelectorAll('.van__main-image img, .van__floorplan img').length).toBe(0)
  })
})

describe('Range — live content', () => {
  it('renders the static range as a fallback when the API is unreachable', async () => {
    const { Range } = await loadWith(Promise.reject(new Error('offline')))
    render(
      <MemoryRouter>
        <Range />
      </MemoryRouter>,
    )

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: staticVans.items[0].name })).toBeInTheDocument(),
    )
  })
})
