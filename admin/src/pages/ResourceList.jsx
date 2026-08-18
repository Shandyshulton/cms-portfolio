import { ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { moduleConfigs } from '../lib/module-configs.js';
import { useLanguage } from '../lib/useLanguage.js';

export default function ResourceList({ type }) {
  const config = moduleConfigs[type];
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const publishedCount = useMemo(() => items.filter((item) => item.status === 'published').length, [items]);

  async function loadItems() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest(`/admin/${config.endpoint}`);
      setItems(payload.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [type]);

  async function deleteItem(item) {
    const confirmed = window.confirm(`Delete ${config.getTitle(item)}?`);
    if (!confirmed) return;

    setError('');
    setMessage('');
    await apiRequest(`/admin/${config.endpoint}/${item.id}`, { method: 'DELETE' });
    setMessage(`${config.singular} deleted successfully.`);
    await loadItems();
  }

  return (
    <main className="content-page projects-page">
      <div className="page-heading-row">
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" type="button" onClick={loadItems} disabled={loading}>
            <RefreshCw size={18} /> {t('refresh')}
          </button>
          <Link className="btn btn-primary" to={`/${config.route}/new`}>
            <Plus size={18} /> New {config.singular}
          </Link>
        </div>
      </div>

      {(message || error) && <div className={error ? 'notice notice-error' : 'notice notice-success'}>{error || message}</div>}

      <section className="project-stats">
        <article><strong>{items.length}</strong><span>{t('totalRecords')}</span></article>
        <article><strong>{publishedCount}</strong><span>{t('published')}</span></article>
        <article><strong>{items.length - publishedCount}</strong><span>{t('drafts')}</span></article>
      </section>

      <section className="panel project-table-panel">
        <div className="panel-header">
          <h2>{config.tableTitle}</h2>
          <span>{loading ? 'Loading data...' : `${items.length} records`}</span>
        </div>
        <div className="project-table-scroll">
          <table className="project-table resource-table">
            <thead>
              <tr>
                <th>{config.primaryColumn}</th>
                <th>{t('status')}</th>
                <th>{config.secondaryColumn}</th>
                <th>{config.metaColumn}</th>
                <th>Link</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="resource-title-cell">
                      <strong>{config.getTitle(item)}</strong>
                      <span>{config.getSubtitle(item)}</span>
                    </div>
                  </td>
                  <td><span className={`status-badge status-${item.status}`}>{item.status}</span></td>
                  <td>{config.getSecondary(item)}</td>
                  <td>{config.getMeta(item)}</td>
                  <td>{config.getLink(item) ? <a className="live-link" href={config.getLink(item)} target="_blank" rel="noreferrer"><ExternalLink size={16} /> Open</a> : '-'}</td>
                  <td>
                    <div className="table-actions">
                      <Link to={`/${config.route}/${item.id}/edit`} aria-label={`Edit ${config.singular}`}><Pencil size={18} /></Link>
                      <button type="button" onClick={() => deleteItem(item)} aria-label={`Delete ${config.singular}`}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && <tr><td colSpan="6" className="empty-table">{t('noRecords')}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

