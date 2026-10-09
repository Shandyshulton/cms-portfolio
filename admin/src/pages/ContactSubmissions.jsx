import { Mail, Paperclip, RefreshCw, Reply, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyAttachment, setReplyAttachment] = useState(null);
  const [sending, setSending] = useState(false);
  const detailRef = useRef(null);

  // On mobile the inbox collapses to a single column (see .inbox-layout
  // @media max-width:1099px) so the detail panel sits below the list.
  // Scroll it into view when a message is opened on those viewports.
  const scrollToDetailOnMobile = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1099px)').matches) return;
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

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
    scrollToDetailOnMobile();
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

  function openReply() {
    setReplyText('');
    setReplyAttachment(null);
    setReplyOpen(true);
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    setError('');
    setMessage('');
    try {
      const formData = new FormData();
      formData.append('reply_message', replyText);
      if (replyAttachment) {
        formData.append('attachment', replyAttachment);
      }
      const payload = await apiRequest(`/admin/contact-submissions/${selected.id}/reply`, {
        method: 'POST',
        body: formData,
      });
      setSelected(payload.submission);
      setSubmissions((current) => current.map((item) => item.id === selected.id ? payload.submission : item));
      setReplyOpen(false);
      setMessage('Reply sent successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
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

        <aside className="panel inbox-detail" ref={detailRef}>
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
                <div><dt>Replied</dt><dd>{selected.replied_at ? formatDate(selected.replied_at) : 'Not yet'}</dd></div>
              </dl>
              <article className="message-body">{selected.message}</article>
              <div className="heading-actions">
                <button className="btn btn-primary" type="button" onClick={openReply}><Reply size={18} /> Reply</button>
                <button className="btn btn-secondary" type="button" onClick={() => archiveSubmission(selected)}>Archive</button>
                <button className="btn btn-secondary danger-action" type="button" onClick={() => deleteSubmission(selected)}><Trash2 size={18} /> Delete</button>
              </div>
            </>
          ) : (
            <div className="empty-panel"><strong>Select a message.</strong><p>Message details will show here.</p></div>
          )}
        </aside>
      </section>

      {replyOpen && selected && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !sending) setReplyOpen(false); }}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reply-title">
            <div className="modal-header">
              <h2 id="reply-title">Reply to {selected.name}</h2>
              <button className="modal-close" type="button" onClick={() => setReplyOpen(false)} disabled={sending} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p className="modal-recipient">To: <a href={`mailto:${selected.email}`}>{selected.email}</a></p>
              <textarea
                className="form-textarea"
                rows={8}
                placeholder={`Write your reply to ${selected.name}...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={sending}
              />
              {replyAttachment ? (
                <div className="attachment-chip">
                  <Paperclip size={16} />
                  <span>{replyAttachment.name}</span>
                  <button type="button" onClick={() => setReplyAttachment(null)} disabled={sending} aria-label="Remove attachment"><X size={16} /></button>
                </div>
              ) : (
                <label className="attachment-picker">
                  <Paperclip size={16} />
                  <span>Attach a file (max 10 MB)</span>
                  <input
                    type="file"
                    onChange={(e) => setReplyAttachment(e.target.files?.[0] ?? null)}
                    disabled={sending}
                  />
                </label>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" type="button" onClick={() => setReplyOpen(false)} disabled={sending}>Cancel</button>
              <button className="btn btn-primary" type="button" onClick={sendReply} disabled={sending || !replyText.trim()}>
                {sending ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}