export default function VanEditor({ van, onBack }) {
  return (
    <button type="button" className="admin-backlink" onClick={onBack}>
      Back to all vans — editing {van.name}
    </button>
  )
}
