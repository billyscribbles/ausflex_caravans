// 301s from the WordPress site this one replaced.
//
// Those paths are still in Google's index and still carry inbound links. The
// SPA fallback answers *everything* with index.html and a 200, so without this
// map an old URL looks like a live page serving the homepage — a soft 404,
// which throws away the ranking the old path accumulated instead of passing it
// to the page that replaced it.
//
// Keys are lowercase and have no trailing slash; the middleware normalises the
// request before looking it up, because WordPress linked every page with a
// trailing slash and both shapes ended up indexed.
export const legacyRedirects = new Map([
  ['/about-us', '/about'],
  ['/our-vans', '/vans'],
  ['/our-vans/our-range', '/vans'],
  ['/our-vans/12ft-tuff-mudder', '/vans/tuff-mudder'],
  ['/our-vans/17ft-little-wonder', '/vans/little-wonder'],
  ['/our-vans/18-6ft-family-adventurer', '/vans/family-adventurer'],
  ['/our-vans/fierce-couple', '/vans/fierce-couple'],
  ['/our-vans/extreme', '/vans/extreme-family'],
  ['/our-vans/onsite-vans', '/vans/on-site'],
])

// Exported for the middleware and the tests so the normalisation rule lives in
// exactly one place.
export function legacyTargetFor(path) {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
  return legacyRedirects.get(trimmed.toLowerCase()) ?? null
}
