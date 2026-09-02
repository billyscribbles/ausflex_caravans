// Contract: the assembled pages have no automatically-detectable accessibility
// violations. This guards the config/content swap — rewriting copy or tokens
// must never silently introduce an a11y regression.
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { axe, toHaveNoViolations } from 'jest-axe'
import Home from '../pages/Home.jsx'
import TourPage from '../pages/TourPage.jsx'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

expect.extend(toHaveNoViolations)

// iframes: false — jsdom has no real frames, so axe cannot inject into the
// Kuula or Google Maps embeds; each iframe itself (title, role) is still
// checked.
async function check(ui) {
  const { container } = render(
    <HelmetProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </HelmetProvider>,
  )
  return await axe(container, { iframes: false })
}

describe('Home — accessibility', () => {
  it('renders with no axe violations', async () => {
    expect(await check(<Home />)).toHaveNoViolations()
  })
})

// /360 stacks a labelled section per tour, each with its own launch button
// carrying the same copy — the shape most at risk of duplicate landmark or
// ambiguous-name violations.
describe('TourPage — accessibility', () => {
  it('renders with no axe violations', async () => {
    expect(await check(<TourPage />)).toHaveNoViolations()
  })
})

// The chrome carries the only disclosure widget on the site — a dropdown of
// the live range hanging off "Our Vans", mirrored as an accordion in the
// mobile panel. Checked both closed and open, since the panel's links only
// enter the tree once it is expanded.
describe('Navbar and Footer — accessibility', () => {
  it('renders with no axe violations', async () => {
    expect(
      await check(
        <>
          <Navbar />
          <Footer />
        </>,
      ),
    ).toHaveNoViolations()
  })

  it('stays clean with the range dropdown open', async () => {
    const { container } = render(
      <HelmetProvider>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </HelmetProvider>,
    )
    await userEvent.click(screen.getAllByRole('button', { name: /show the range/i })[0])

    expect(await axe(container, { iframes: false })).toHaveNoViolations()
  })
})
