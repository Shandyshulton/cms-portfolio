import { Mail, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';

function formatDate(value) {
  return value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
}

export default function ContactSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function loadSubmissions() {
    setLoading(true);
    setError('');
    try {
      const payload = await apiRequest('/admin/contact-submissions');
      setSubmissions(payload.data ?? []);
      if (!selected && payload.data?.[0]) setSelected(payload.data[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openSubmission(submission) {
    setSelected(submission);
    if (submission.status !== 'new') return;

    try {
      const payload = await apiRequest(`/admin/contact-submissions/${submission.id}`);
      setSelected(payload.submission);
      setSubmissions((current) => current.map((item) => item.id === submission.id ? payload.submission : item));
    } catch (err) {
      setError(err.message);
    }
  }

  async function archiveSubmission(submission) {
    try {
      const payload = await apiRequest(`/admin/contact-submissions/${submission.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' }),
      });
      setSelected(payload.submission);
      setSubmissions((current) => current.map((item) => item.id === submission.id ? payload.submission : item));
      setMessage('Submission archived.');
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteSubmission(submission) {
    const confirmed = window.confirm(`Delete message from ${submission.name}?`);
    if (!confirmed) return;

    try {
      await apiRequest(`/admin/contact-submissions/${submission.id}`, { method: 'DELETE' });
      setSubmissions((current) => current.filter((item) => item.id !== submission.id));
      setSelected((current) => current?.id === submission.id ? null : current);
      setMessage('Submission deleted.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="content-page projects-page">
      <div className="page-heading-row">
        <div>
          <h1>Contact Inbox</h1>
          <p>Messages submitted from the public portfolio contact form.</p>
        </div>
        <button className="btn btn-secondary" type="button" onClick={loadSubmissions} disabled={loading}>
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      {(message || error) && <div className={error ? 'notice notice-error' : 'notice notice-success'}>{error || message}</div>}

      <section className="inbox-layout">
        <div className="panel inbox-list">
          <div className="panel-header"><h2>Submissions</h2><span>{loading ? 'Loading...' : `${submissions.length} messages`}</span></div>
          {submissions.length > 0 ? submissions.map((submission) => (
            <button key={submission.id} type="button" className={`inbox-item ${selected?.id === submission.id ? 'active' : ''}`} onClick={() => openSubmission(submission)}>
              <span className={`inbox-status ${submission.status}`} />
              <div>
                <strong>{submission.subject}</strong>
                <p>{submission.name} - {submission.email}</p>
              </div>
              <time>{formatDate(submission.created_at)}</time>
            </button>
          )) : (
            <div className="empty-panel"><strong>No messages yet.</strong><p>New public contact submissions will appear here.</p></div>
          )}
        </div>

        <aside className="panel inbox-detail">
          {selected ? (
            <>
              <div className="inbox-detail-head">
                <div className="metric-icon"><Mail size={24} /></div>
                <div>
                  <span className={`status-badge status-${selected.status === 'new' ? 'draft' : 'published'}`}>{selected.status}</span>
                  <h2>{selected.subject}</h2>
                  <p>{formatDate(selected.created_at)}</p>
                </div>
              </div>
              <dl className="message-meta">
                <div><dt>Name</dt><dd>{selected.name}</dd></div>
                <div><dt>Email</dt><dd><a href={`mailto:${selected.email}`}>{selected.email}</a></dd></div>
                <div><dt>Email Forwarded</dt><dd>{selected.email_sent_at ? formatDate(selected.email_sent_at) : 'Not confirmed'}</dd></div>
              </dl>
              <article className="message-body">{selected.message}</article>
              <div className="heading-actions">
                <button className="btn btn-secondary" type="button" onClick={() => archiveSubmission(selected)}>Archive</button>
                <button className="btn btn-secondary danger-action" type="button" onClick={() => deleteSubmission(selected)}><Trash2 size={18} /> Delete</button>
              </div>
            </>
          ) : (
            <div className="empty-panel"><strong>Select a message.</strong><p>Message details will show here.</p></div>
          )}
        </aside>
      </section>
    </main>
  );
}