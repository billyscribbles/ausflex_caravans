// Contract: components are "dumb" — they render brand strings and links
// straight from site.config, never hardcoded. This proves the wire is live,
// so a config swap is enough to reskin the chrome.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import VirtualTour from '../components/VirtualTour.jsx'
import { site } from '../config/site.config.js'
import { tour } from '../content/tour.js'

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
    { id: 'a', title: 'Explorer 21', embedUrl: 'https://kuula.co/share/a', poster: '/images/x.jpg' },
    { id: 'b', title: 'Sea Breeze', embedUrl: 'https://kuula.co/share/b', poster: '/images/y.jpg' },
  ]

  const renderTour = (props) =>
    render(
      <MemoryRouter>
        <VirtualTour content={tour} {...props} />
      </MemoryRouter>,
    )

  it('renders a picker with one button per tour and one iframe', () => {
    renderTour({ tours, full: true })

    expect(screen.getByRole('button', { name: /Explorer 21/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sea Breeze/ })).toBeInTheDocument()
    // Mounting several Kuula players at once would be punishing.
    expect(document.querySelectorAll('iframe').length).toBe(1)
  })

  it('swaps the iframe src when another tour is picked, keeping one iframe', async () => {
    const user = userEvent.setup()
    renderTour({ tours, full: true })

    expect(document.querySelector('iframe').getAttribute('src')).toBe(tours[0].embedUrl)

    await user.click(screen.getByRole('button', { name: /Sea Breeze/ }))

    expect(document.querySelectorAll('iframe').length).toBe(1)
    expect(document.querySelector('iframe').getAttribute('src')).toBe(tours[1].embedUrl)
  })

  it('marks the active tour for assistive tech', async () => {
    const user = userEvent.setup()
    renderTour({ tours, full: true })

    expect(screen.getByRole('button', { name: /Explorer 21/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
    await user.click(screen.getByRole('button', { name: /Sea Breeze/ }))
    expect(screen.getByRole('button', { name: /Sea Breeze/ })).toHaveAttribute(
      'aria-current',
      'true',
    )
  })

  it('renders no picker and stays behind the poster on the home band', () => {
    renderTour({ tours })
    expect(screen.queryByRole('button', { name: /Sea Breeze/ })).not.toBeInTheDocument()
    expect(document.querySelectorAll('iframe').length).toBe(0)
  })
})
