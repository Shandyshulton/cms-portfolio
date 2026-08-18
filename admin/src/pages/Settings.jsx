import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/api.js';

const defaults = {
  general: {
    profile: {
      name: '', headline: '', email: '', phone: '', location: '', github: '', linkedin: '', summary: '',
    },
  },
  home: {
    content: {
      greeting: '', available_text: '', about_label: '', about_title: '', about_paragraph_1: '', about_paragraph_2: '',
    },
  },
  contact: {
    content: { section_label: '', title: '', intro: '' },
    form: { recipient_email: '', success_title: '', success_text: '' },
  },
  api: { public_api_enabled: { value: true } },
  security: { session_timeout_minutes: { value: 120 } },
};

export default function Settings() {
  const [settings, setSettings] = useState(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const payload = await apiRequest('/admin/settings');
        setSettings({
          ...defaults,
          ...payload.settings,
          general: { ...defaults.general, ...(payload.settings?.general ?? {}), profile: { ...defaults.general.profile, ...(payload.settings?.general?.profile ?? {}) } },
          home: { ...defaults.home, ...(payload.settings?.home ?? {}), content: { ...defaults.home.content, ...(payload.settings?.home?.content ?? {}) } },
          contact: {
            ...defaults.contact,
            ...(payload.settings?.contact ?? {}),
            content: { ...defaults.contact.content, ...(payload.settings?.contact?.content ?? {}) },
            form: { ...defaults.contact.form, ...(payload.settings?.contact?.form ?? {}) },
          },
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateNested(group, key, field, value) {
    setSettings((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: { ...(current[group]?.[key] ?? {}), [field]: value },
      },
    }));
  }

  async function saveSettings(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      await apiRequest('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) });
      setMessage('Settings updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="content-page projects-page">
      <div className="page-heading-row">
        <div>
          <h1>Settings</h1>
          <p>Edit public home, contact, profile, and delivery settings.</p>
        </div>
        <button className="btn btn-primary" type="submit" form="settings-form" disabled={saving || loading}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {(message || error) && <div className={error ? 'notice notice-error' : 'notice notice-success'}>{error || message}</div>}
      {loading ? <section className="panel empty-panel"><strong>Loading settings...</strong></section> : (
        <form id="settings-form" className="settings-grid" onSubmit={saveSettings}>
          <section className="settings-card panel">
            <h2>Profile</h2>
            <label><span>Name</span><input value={settings.general.profile.name ?? ''} onChange={(event) => updateNested('general', 'profile', 'name', event.target.value)} /></label>
            <label><span>Headline</span><input value={settings.general.profile.headline ?? ''} onChange={(event) => updateNested('general', 'profile', 'headline', event.target.value)} /></label>
            <label><span>Email</span><input type="email" value={settings.general.profile.email ?? ''} onChange={(event) => updateNested('general', 'profile', 'email', event.target.value)} /></label>
            <label><span>Phone</span><input value={settings.general.profile.phone ?? ''} onChange={(event) => updateNested('general', 'profile', 'phone', event.target.value)} /></label>
            <label><span>Location</span><input value={settings.general.profile.location ?? ''} onChange={(event) => updateNested('general', 'profile', 'location', event.target.value)} /></label>
            <label><span>GitHub URL</span><input value={settings.general.profile.github ?? ''} onChange={(event) => updateNested('general', 'profile', 'github', event.target.value)} /></label>
            <label><span>LinkedIn URL</span><input value={settings.general.profile.linkedin ?? ''} onChange={(event) => updateNested('general', 'profile', 'linkedin', event.target.value)} /></label>
            <label><span>Hero Summary</span><textarea rows="5" value={settings.general.profile.summary ?? ''} onChange={(event) => updateNested('general', 'profile', 'summary', event.target.value)} /></label>
          </section>

          <section className="settings-card panel">
            <h2>Home Page</h2>
            <label><span>Greeting</span><input value={settings.home.content.greeting ?? ''} onChange={(event) => updateNested('home', 'content', 'greeting', event.target.value)} /></label>
            <label><span>Availability Text</span><input value={settings.home.content.available_text ?? ''} onChange={(event) => updateNested('home', 'content', 'available_text', event.target.value)} /></label>
            <label><span>About Label</span><input value={settings.home.content.about_label ?? ''} onChange={(event) => updateNested('home', 'content', 'about_label', event.target.value)} /></label>
            <label><span>About Title</span><textarea rows="3" value={settings.home.content.about_title ?? ''} onChange={(event) => updateNested('home', 'content', 'about_title', event.target.value)} /></label>
            <label><span>About Paragraph 1</span><textarea rows="4" value={settings.home.content.about_paragraph_1 ?? ''} onChange={(event) => updateNested('home', 'content', 'about_paragraph_1', event.target.value)} /></label>
            <label><span>About Paragraph 2</span><textarea rows="4" value={settings.home.content.about_paragraph_2 ?? ''} onChange={(event) => updateNested('home', 'content', 'about_paragraph_2', event.target.value)} /></label>
          </section>

          <section className="settings-card panel">
            <h2>Contact Page</h2>
            <label><span>Section Label</span><input value={settings.contact.content.section_label ?? ''} onChange={(event) => updateNested('contact', 'content', 'section_label', event.target.value)} /></label>
            <label><span>Title</span><input value={settings.contact.content.title ?? ''} onChange={(event) => updateNested('contact', 'content', 'title', event.target.value)} /></label>
            <label><span>Intro</span><textarea rows="5" value={settings.contact.content.intro ?? ''} onChange={(event) => updateNested('contact', 'content', 'intro', event.target.value)} /></label>
            <label><span>Recipient Email</span><input type="email" value={settings.contact.form.recipient_email ?? ''} onChange={(event) => updateNested('contact', 'form', 'recipient_email', event.target.value)} /></label>
            <label><span>Success Title</span><input value={settings.contact.form.success_title ?? ''} onChange={(event) => updateNested('contact', 'form', 'success_title', event.target.value)} /></label>
            <label><span>Success Text</span><textarea rows="3" value={settings.contact.form.success_text ?? ''} onChange={(event) => updateNested('contact', 'form', 'success_text', event.target.value)} /></label>
          </section>

          <section className="settings-card panel">
            <h2>System</h2>
            <label className="toggle-row"><input type="checkbox" checked={Boolean(settings.api.public_api_enabled.value)} onChange={(event) => updateNested('api', 'public_api_enabled', 'value', event.target.checked)} /> Public API enabled</label>
            <label><span>Session Timeout Minutes</span><input type="number" value={settings.security.session_timeout_minutes.value} onChange={(event) => updateNested('security', 'session_timeout_minutes', 'value', Number(event.target.value))} /></label>
          </section>
        </form>
      )}
    </main>
  );
}