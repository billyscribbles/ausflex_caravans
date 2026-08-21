import SEO from '../lib/seo.jsx'
import { legal } from '../content/legal.js'
import './LegalPage.css'

export default function LegalPage({ type = 'privacy' }) {
  const doc = legal[type]
  if (!doc) return null

  return (
    <main className="legal">
      <SEO title={doc.title} path={`/${type}`} />
      <header className="page-hero">
        <div className="container legal__inner">
          <h1 className="page-hero__title">{doc.title}</h1>
          {doc.updated && <p className="legal__updated">{doc.updated}</p>}
        </div>
      </header>
      <div className="container legal__inner legal__content">
        {doc.sections.map((s) => (
          <section key={s.heading} className="legal__section">
            <h2 className="legal__heading">{s.heading}</h2>
            <p className="legal__body">{s.body}</p>
          </section>
        ))}
      </div>
    </main>
  )
}
