// Opt-in Google Analytics 4 wiring. Every function here is a no-op unless
// `integrations.gaId` is set (via VITE_GA_ID) — clients who skip analytics
// ship no gtag script and no tracking calls.

import { site } from '../config/site.config.js'

const gaId = site.integrations.gaId

let initialized = false

// Injects the GA4 gtag script. Safe (and free) to call when no gaId is set.
// Call once at app boot, before the first route renders.
export function initAnalytics() {
  if (!gaId || initialized || typeof document === 'undefined') return
  initialized = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(script)

  window.dataLayer = window.dataLayer || []
  // gtag must forward `arguments` verbatim — this is the GA-prescribed shim.
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  // SPA: we emit page_view manually on route change (see trackPageview).
  window.gtag('config', gaId, { send_page_view: false })
}

// Records a single-page-app page view. No-ops when analytics is not configured.
export function trackPageview(path) {
  if (!gaId || typeof window.gtag !== 'function') return
  window.gtag('event', 'page_view', {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  })
}
