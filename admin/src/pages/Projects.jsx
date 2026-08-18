import { ExternalLink, ImagePlus, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { useLanguage } from '../lib/useLanguage.js';

export default function Projects() {
  const { t } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const totalImages = useMemo(() => projects.reduce((sum, project) => sum + (project.images?.filter((image) => image.image_type === 'gallery').length ?? 0), 0), [projects]);

  async function loadProjects() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/admin/projects');
      setProjects(payload.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  async function deleteProject(project) {
    const translation = project.translations?.find((item) => item.locale === 'id') ?? project.translations?.[0];
    const confirmed = window.confirm(`Delete ${translation?.title ?? project.slug}?`);
    if (!confirmed) return;

    setError('');
    setMessage('');
    await apiRequest(`/admin/projects/${project.id}`, { method: 'DELETE' });
    setMessage('Project deleted successfully.');
    await loadProjects();
  }

  return (
    <main className="content-page projects-page">
      <div className="page-heading-row">
        <div>
          <h1>{t('projectManagement')}</h1>
          <p>{t('projectDescription')}</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" type="button" onClick={loadProjects} disabled={loading}>
            <RefreshCw size={18} /> {t('refresh')}
          </button>
          <Link className="btn btn-primary" to="/projects/new">
            <Plus size={18} /> {t('newProject')}
          </Link>
        </div>
      </div>

      {(message || error) && <div className={error ? 'notice notice-error' : 'notice notice-success'}>{error || message}</div>}

      <section className="project-stats">
        <article><strong>{projects.length}</strong><span>{t('totalProjects')}</span></article>
        <article><strong>{projects.filter((project) => project.status === 'published').length}</strong><span>{t('published')}</span></article>
        <article><strong>{totalImages}</strong><span>{t('galleryImages')}</span></article>
      </section>

      <section className="panel project-table-panel">
        <div className="panel-header">
          <h2>{t('portfolioEntries')}</h2>
          <span>{loading ? 'Loading data...' : `${projects.length} records`}</span>
        </div>
        <div className="project-table-scroll">
          <table className="project-table">
            <thead>
              <tr>
                <th>{t('project')}</th>
                <th>{t('status')}</th>
                <th>{t('stack')}</th>
                <th>{t('gallery')}</th>
                <th>{t('live')}</th>
                <th>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => {
                const translation = project.translations?.find((item) => item.locale === 'id') ?? project.translations?.[0];
                const cover = project.images?.find((image) => image.image_type === 'hero') ?? project.images?.find((image) => image.is_cover) ?? project.images?.[0];
                const galleryCount = project.images?.filter((image) => image.image_type === 'gallery').length ?? 0;

                return (
                  <tr key={project.id}>
                    <td>
                      <div className="project-name-cell">
                        <div className="project-thumb">
                          {cover?.image_url ? <img src={cover.image_url} alt={cover.alt_text ?? translation?.title ?? project.slug} /> : <ImagePlus size={22} />}
                        </div>
                        <div>
                          <strong>{translation?.title ?? project.slug}</strong>
                          <span>{project.category ?? 'Uncategorized'} - {project.slug}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className={`status-badge status-${project.status}`}>{project.status}</span></td>
                    <td><div className="stack-list">{(project.stacks ?? []).map((stack) => <span key={stack}>{stack}</span>)}</div></td>
                    <td>{galleryCount} gallery</td>
                    <td>{project.live_url ? <a className="live-link" href={project.live_url} target="_blank" rel="noreferrer"><ExternalLink size={16} /> {t('visit')}</a> : '-'}</td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/projects/${project.id}/edit`} aria-label="Edit project"><Pencil size={18} /></Link>
                        <button type="button" onClick={() => deleteProject(project)} aria-label="Delete project"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && projects.length === 0 && (
                <tr><td colSpan="6" className="empty-table">{t('noProjects')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

