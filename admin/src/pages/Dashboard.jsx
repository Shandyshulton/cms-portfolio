import { ArrowRight, Download, Folder, Plus, Trophy, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

const fallbackStats = {
  metrics: { projects: 0, experiences: 0, certifications: 0 },
  health: {
    bilingual_coverage: 0,
    image_alt_tags: 0,
    total_content: 0,
    complete_content: 0,
    total_images: 0,
    images_with_alt: 0,
    tip: 'Loading portfolio health...',
    missing_bilingual: [],
  },
  jump_projects: [],
};

export default function Dashboard() {
  const [stats, setStats] = useState(fallbackStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const payload = await apiRequest('/admin/dashboard');
        setStats(payload);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const bilingual = stats.health.bilingual_coverage;
  const altTags = stats.health.image_alt_tags;

  return (
    <main className="content-page">
      <div className="page-heading-row">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back. Here's what's happening with your portfolio.</p>
        </div>
        <div className="heading-actions">
          <button className="btn btn-secondary" type="button"><Download size={18} /> Export Report</button>
          <Link className="btn btn-primary" to="/projects/new"><Plus size={18} /> Quick Add</Link>
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}

      <section className="dashboard-grid">
        <article className="metric-card">
          <div className="metric-icon"><Folder size={26} /></div>
          <span className="metric-trend">{loading ? '...' : `${stats.health.complete_content}/${stats.health.total_content} bilingual`}</span>
          <p>Total Projects</p>
          <strong>{stats.metrics.projects}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><UserRound size={26} /></div>
          <span>{loading ? '...' : 'active records'}</span>
          <p>Total Experience</p>
          <strong>{stats.metrics.experiences}</strong>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><Trophy size={26} /></div>
          <span className="metric-warning">{loading ? '...' : 'tracked credentials'}</span>
          <p>Certifications</p>
          <strong>{stats.metrics.certifications}</strong>
        </article>
        <article className="quick-card">
          <span>Quick Setup</span>
          <h2>Bilingual Polish</h2>
          <Link to="/projects">Check Status <ArrowRight size={20} /></Link>
        </article>
      </section>

      <section className="dashboard-main-grid">
        <article className="panel activity-panel">
          <div className="panel-header">
            <h2>Content Gaps</h2>
            <Link to="/projects">Open Projects</Link>
          </div>
          <div className="activity-list">
            {stats.health.missing_bilingual.length > 0 ? stats.health.missing_bilingual.map((item, index) => (
              <div className="activity-item" key={`${item.type}-${item.title}`}>
                <div className={`activity-thumb activity-thumb-${index + 1}`}>!</div>
                <div>
                  <strong>{item.type}: {item.title}</strong>
                  <p>Missing complete ID/EN translation.</p>
                </div>
                <time>Needs polish</time>
              </div>
            )) : (
              <div className="activity-item">
                <div className="activity-thumb">OK</div>
                <div>
                  <strong>Bilingual content complete</strong>
                  <p>No missing ID/EN descriptions detected.</p>
                </div>
                <time>Healthy</time>
              </div>
            )}
          </div>
        </article>

        <aside className="side-panels">
          <article className="panel health-panel" id="status">
            <h2>Portfolio Health</h2>
            <div className="progress-row"><span>Bilingual Coverage</span><b>{bilingual}%</b></div>
            <div className="progress"><i style={{ width: `${bilingual}%` }} /></div>
            <div className="progress-row"><span>Image Alt-Tags</span><b>{altTags}%</b></div>
            <div className="progress progress-warning"><i style={{ width: `${altTags}%` }} /></div>
            <div className="tip-box">{stats.health.tip}</div>
          </article>

          <article className="panel jump-panel">
            <h2>Jump To Project</h2>
            <ul>
              {stats.jump_projects.length > 0 ? stats.jump_projects.map((project) => (
                <li key={project.id}><span className={`dot ${project.status === 'published' ? 'live' : 'muted'}`} /> {project.title}</li>
              )) : <li><span className="dot muted" /> No projects yet</li>}
            </ul>
          </article>
        </aside>
      </section>
    </main>
  );
}
