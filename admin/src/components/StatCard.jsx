/**
 * StatCard - reusable statistic card for admin list pages.
 *
 * Props:
 *  - icon:  a lucide-react icon component (e.g. FolderGit2). Rendered at 22px,
 *           marked aria-hidden because the label already conveys the meaning.
 *  - label: short descriptive text shown above the value.
 *  - value: the number / string highlighted below the label.
 *  - tone:  'default' | 'success' | 'warning' (optional) - picks the icon tint.
 *
 * Visual styling lives in index.css under .stat-card.
 */
export default function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const toneClass = tone === 'success' ? 'stat-card-success' : tone === 'warning' ? 'stat-card-warning' : '';

  return (
    <article className={`stat-card ${toneClass}`.trim()}>
      {Icon && (
        <span className="stat-icon" aria-hidden="true">
          <Icon size={22} />
        </span>
      )}
      <div className="stat-body">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
      </div>
    </article>
  );
}
