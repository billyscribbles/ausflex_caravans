// Contract: the site chrome advertises whatever range the dashboard currently
// holds. Adding, renaming, re-slugging or deleting a van has to move through
// the navbar dropdown and the footer's Range column with no config edit — that
// is the whole point of building both off the live payload.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vanLinks } from '../lib/vanLinks.js'

// The store fetches at module scope; these components only ever read useVans,
// so stubbing the hook is enough to drive them from a fixture.
const live = vi.hoisted(() => ({ vans: { items: [] } }))
vi.mock('../lib/contentStore.js', () => ({
  useVans: () => ({ loading: false, vans: live.vans }),
}))

const Navbar = (await import('../components/Navbar.jsx')).default
const Footer = (await import('../components/Footer.jsx')).default

const van = (slug, name, length = '') => ({ id: slug, slug, name, length })

const RANGE = [
  van('tuff-mudder', 'Tuff Mudder', '12ft'),
  van('little-wonder', 'Little Wonder', '17ft'),
  van('on-site', 'On-Site Caravans', 'Up to 32ft'),
]

const setRange = (items) => {
  live.vans = { items }
}

const at = (path, ui) => render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>)

beforeEach(() => setRange(RANGE))

describe('vanLinks', () => {
  it('leads the label with a plain measurement, and only a plain one', () => {
    const [mudder, , onSite] = vanLinks(RANGE)
    expect(mudder.label).toBe('12ft Tuff Mudder')
    // "Up to 32ft On-Site Caravans" would read as a mistake.
    expect(onSite.label).toBe('On-Site Caravans')
  })

  it('holds back a van the dashboard has not slugged yet', () => {
    // A new van is created with a name and nothing else — there is no page to
    // link to until its slug is filled in.
    expect(vanLinks([van('', 'Draft Van')])).toEqual([])
  })
})

describe('Navbar — the range dropdown', () => {
  const desktop = () => screen.getByRole('navigation', { name: 'Main navigation' })

  it('keeps the panel closed, and out of the tab order, until it is opened', async () => {
    at('/', <Navbar />)
    const toggle = within(desktop()).getByRole('button', { name: /show the range/i })

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(within(desktop()).queryByRole('link', { name: /Tuff Mudder/ })).not.toBeInTheDocument()

    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(within(desktop()).getByRole('link', { name: /Tuff Mudder/ })).toBeInTheDocument()
  })

  it('lists every live van, and leaves "Our Vans" itself a link to the index', async () => {
    at('/', <Navbar />)
    await userEvent.click(within(desktop()).getByRole('button', { name: /show the range/i }))

    for (const item of RANGE) {
      expect(within(desktop()).getByRole('link', { name: new RegExp(item.name) })).toHaveAttribute(
        'href',
        `/vans/${item.slug}`,
      )
    }
    expect(within(desktop()).getByRole('link', { name: 'Our Vans' })).toHaveAttribute(
      'href',
      '/vans',
    )
  })

  it('picks up a van added in the dashboard and drops one deleted there', async () => {
    setRange([...RANGE, van('sky-lounge', 'Sky Lounge', '24ft')])
    const { unmount } = at('/', <Navbar />)
    await userEvent.click(within(desktop()).getByRole('button', { name: /show the range/i }))
    expect(within(desktop()).getByRole('link', { name: /Sky Lounge/ })).toBeInTheDocument()
    unmount()

    setRange(RANGE.filter((v) => v.slug !== 'little-wonder'))
    at('/', <Navbar />)
    await userEvent.click(within(desktop()).getByRole('button', { name: /show the range/i }))
    expect(within(desktop()).queryByRole('link', { name: /Little Wonder/ })).not.toBeInTheDocument()
  })

  it('marks the van being viewed without marking its siblings', async () => {
    at('/vans/little-wonder', <Navbar />)
    await userEvent.click(within(desktop()).getByRole('button', { name: /show the range/i }))

    expect(within(desktop()).getByRole('link', { name: /Little Wonder/ })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(desktop()).getByRole('link', { name: /Tuff Mudder/ })).not.toHaveAttribute(
      'aria-current',
    )
    // The parent still owns its children, so the section reads as current too.
    expect(within(desktop()).getByRole('link', { name: 'Our Vans' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('falls back to a plain link when there is no range to show', () => {
    setRange([])
    at('/', <Navbar />)

    expect(
      within(desktop()).queryByRole('button', { name: /show the range/i }),
    ).not.toBeInTheDocument()
    expect(within(desktop()).getByRole('link', { name: 'Our Vans' })).toBeInTheDocument()
  })
})

describe('Footer — the Range quick links', () => {
  const column = () => screen.getByRole('navigation', { name: 'The Range' })

  it('carries one quick link per live van, in dashboard order', () => {
    at('/', <Footer />)
    const hrefs = within(column())
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))

    expect(hrefs).toEqual(['/vans/tuff-mudder', '/vans/little-wonder', '/vans/on-site'])
    expect(within(column()).getByRole('link', { name: '12ft Tuff Mudder' })).toBeInTheDocument()
  })

  it('picks up a van added in the dashboard and drops one deleted there', () => {
    setRange([...RANGE, van('sky-lounge', 'Sky Lounge', '24ft')])
    const { unmount } = at('/', <Footer />)
    expect(within(column()).getByRole('link', { name: '24ft Sky Lounge' })).toBeInTheDocument()
    unmount()

    setRange(RANGE.filter((v) => v.slug !== 'on-site'))
    at('/', <Footer />)
    expect(
      within(column()).queryByRole('link', { name: 'On-Site Caravans' }),
    ).not.toBeInTheDocument()
  })

  it('drops the whole column rather than leaving a bare heading', () => {
    setRange([])
    at('/', <Footer />)

    expect(screen.queryByRole('navigation', { name: 'The Range' })).not.toBeInTheDocument()
    // The static columns are untouched by an empty range.
    expect(screen.getByRole('navigation', { name: 'Explore' })).toBeInTheDocument()
  })
})
