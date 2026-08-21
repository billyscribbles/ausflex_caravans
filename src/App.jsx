import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useLayoutEffect, lazy, Suspense } from 'react'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import Home from './pages/Home.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import RouteFallback from './components/RouteFallback.jsx'
import { trackPageview } from './lib/analytics.js'

// Retry lazy imports once, then force a reload if the chunk is gone.
// Prevents white-pages on stale tabs after a redeploy.
const RELOAD_KEY = 'foundation:chunk-reloaded'
function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((err) => {
      const already = sessionStorage.getItem(RELOAD_KEY) === '1'
      if (!already) {
        sessionStorage.setItem(RELOAD_KEY, '1')
        window.location.reload()
        return new Promise(() => {})
      }
      sessionStorage.removeItem(RELOAD_KEY)
      throw err
    }),
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_KEY))
}

const VansPage = lazyWithRetry(() => import('./pages/VansPage.jsx'))
const VanPage = lazyWithRetry(() => import('./pages/VanPage.jsx'))
const WhyPage = lazyWithRetry(() => import('./pages/WhyPage.jsx'))
const GalleryPage = lazyWithRetry(() => import('./pages/GalleryPage.jsx'))
const AboutPage = lazyWithRetry(() => import('./pages/AboutPage.jsx'))
const ContactPage = lazyWithRetry(() => import('./pages/ContactPage.jsx'))
const LegalPage = lazyWithRetry(() => import('./pages/LegalPage.jsx'))
const NotFoundPage = lazyWithRetry(() => import('./pages/NotFoundPage.jsx'))

// Resets scroll on navigation and reports the page view to analytics.
function RouteChange() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }
  }, [])
  useLayoutEffect(() => {
    if (hash) return
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])
  useEffect(() => {
    trackPageview(`${pathname}${hash}`)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <RouteChange />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      {/* Skip-link target. Each routed page renders its own <main> landmark;
          this wrapper just gives the skip link a stable, focusable anchor. */}
      <div id="main" tabIndex={-1}>
        <ErrorBoundary>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/vans" element={<VansPage />} />
              <Route path="/vans/:slug" element={<VanPage />} />
              <Route path="/why-ausflex" element={<WhyPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<LegalPage type="privacy" />} />
              <Route path="/terms" element={<LegalPage type="terms" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </div>
      <Footer />
    </BrowserRouter>
  )
}
