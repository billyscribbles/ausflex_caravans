// The van range as chrome links. The navbar dropdown and the footer's Range
// column both read this, off the same live `/api/content` payload the range
// pages use — so a van added, renamed, re-slugged or deleted in the dashboard
// moves through the whole site chrome without anyone editing site.config.
//
// A van created in the dashboard starts with a blank slug and gets filled in
// over several saves. Until it has one there is no page to point at, so it is
// not advertised yet.
export function vanLinks(items = []) {
  return items
    .filter((van) => van.slug && van.name)
    .map((van) => {
      // Only a plain measurement leads the label: "12ft Tuff Mudder" reads as
      // the range, "Up to 32ft On-Site Caravans" reads as a mistake.
      const length = /^\d/.test(van.length ?? '') ? van.length : ''
      return {
        to: `/vans/${van.slug}`,
        name: van.name,
        length,
        label: length ? `${length} ${van.name}` : van.name,
      }
    })
}
