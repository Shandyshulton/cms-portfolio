import { ArrowLeft, ExternalLink, Globe2, GraduationCap, ImagePlus, Save, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { baseForm, moduleConfigs, splitCsv } from '../lib/module-configs.js';

const WORK_MODELS = ['Full-time', 'Internship', 'Contract', 'Freelance'];
const DEGREE_PRESETS = ["Bachelor's", 'Vocational High School', 'Associate', "Master's"];
const EXPERIENCE_TABS = ['role', 'desc'];
const EDUCATION_TABS = ['info', 'desc'];
const CERTIFICATION_TABS = ['credential', 'desc'];

function defaultTabFor(type) {
  if (type === 'education') return 'info';
  if (type === 'certification') return 'credential';
  return 'role';
}

function countLines(value) {
  return (value ?? '').split('\n').filter((line) => line.trim()).length;
}

export default function ResourceForm({ type }) {
  const config = moduleConfigs[type];
  const { itemId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(itemId);
  const [form, setForm] = useState(baseForm());
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(defaultTabFor(type));
  const [langView, setLangView] = useState('split');
  const [noExpiry, setNoExpiry] = useState(false);

  // Keep the open tab valid when navigating between the shared form types.
  useEffect(() => {
    setActiveTab(defaultTabFor(type));
  }, [type]);

  useEffect(() => {
    async function loadItem() {
      if (!isEditing) return;

      setLoading(true);
      setError('');
      try {
        const payload = await apiRequest(`/admin/${config.endpoint}/${itemId}`);
        const item = payload[config.responseKey];
        setForm(config.toForm(item));
        setImagePreview(config.imageField ? item[config.imageField.valueKey] ?? '' : '');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [config, isEditing, itemId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateTranslation(locale, field, value) {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [locale]: { ...current.translations[locale], [field]: value },
      },
    }));
  }

  function updateImage(file) {
    if (imagePreview && imagePreview.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : '');
  }

  // Enabling "Current role" clears the end date (the payload already sends null,
  // so server output is unchanged either way).
  function toggleCurrentRole(checked) {
    setForm((current) => ({ ...current, is_current: checked, end_date: checked ? '' : current.end_date }));
  }

  // "Lifetime credential": clears and disables EXPIRES AT (payload already sends
  // `expires_at: null` when the value is empty).
  function toggleNoExpiry(checked) {
    setNoExpiry(checked);
    if (checked) updateField('expires_at', '');
  }

  function handleTabKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = tabs.indexOf(activeTab);
    const step = event.key === 'ArrowRight' ? 1 : tabs.length - 1;
    const next = tabs[(current + step) % tabs.length];
    setActiveTab(next);
    document.getElementById(`etable-${next}`)?.focus();
  }

  function revealInvalidTab(event) {
    const panel = event.target.closest?.('[data-tab-panel]');
    if (panel?.dataset.tabPanel) setActiveTab(panel.dataset.tabPanel);
  }

  function buildBody() {
    const payload = config.toPayload(form);

    if (!config.imageField) {
      return JSON.stringify(payload);
    }

    const formData = new FormData();
    formData.append('payload', JSON.stringify(payload));
    if (imageFile) {
      formData.append(config.imageField.key, imageFile);
    }
    if (isEditing) {
      formData.append('_method', 'PUT');
    }

    return formData;
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const path = isEditing ? `/admin/${config.endpoint}/${itemId}` : `/admin/${config.endpoint}`;
      const method = config.imageField && isEditing ? 'POST' : isEditing ? 'PUT' : 'POST';
      await apiRequest(path, { method, body: buildBody() });
      navigate(`/${config.route}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const isExperience = type === 'experience';
  const isEducation = type === 'education';
  const isCertification = type === 'certification';
  const tabs = isEducation ? EDUCATION_TABS : isCertification ? CERTIFICATION_TABS : EXPERIENCE_TABS;
  const skills = splitCsv(form.skillsText ?? '');
  const roleCompany = [form.role, form.company_name].filter(Boolean).join(' @ ');
  const dynamicTitle = roleCompany || config.getTitle(form) || `Untitled ${config.singular}`;
  const previewDescription = (form.translations.id.description || form.translations.en.description || '').trim();
  const previewSnippet = previewDescription.length > 140 ? `${previewDescription.slice(0, 140)}…` : previewDescription;
  const dateRange = `${form.start_date || '—'} → ${form.is_current ? 'Present' : (form.end_date || '—')}`;
  const educationTitle = [form.degree, form.institution_name].filter(Boolean).join(' — ') || 'Untitled Education';
  const educationRange = `${form.start_date || '—'} → ${form.end_date || '—'}`;
  const educationHighlights = (form.translations.id.highlightsText || '').split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 5);
  const certificationTitle = [form.name, form.issuer].filter(Boolean).join(' — ') || 'Untitled Certification';
  const certificationDates = `${form.issued_at ? `Issued ${form.issued_at}` : 'Issued —'}${form.expires_at ? ` · Expires ${form.expires_at}` : ' · No expiry'}`;

  const header = (
    <div className="form-sticky-head">
      <div className="form-head-main">
        <Link className="back-link" to={`/${config.route}`}><ArrowLeft size={18} /> Back to {config.singular}</Link>
        <h1>{isEditing ? `Edit ${config.singular}` : `Create ${config.singular}`}</h1>
        <p>{config.description}</p>
      </div>
      <div className="heading-actions">
        <Link className="btn btn-secondary" to={`/${config.route}`}><X size={18} /> Cancel</Link>
        <button className="btn btn-primary" type="submit" form="resource-form" disabled={saving || loading}>
          <Save size={18} /> {saving ? 'Saving...' : `Save ${config.singular}`}
        </button>
      </div>
    </div>
  );

  return (
    <main className="content-page projects-page">
      {header}

      {error && <div className="notice notice-error">{error}</div>}

      {/* Sticky Save/Cancel bar for mobile (hidden on desktop via CSS) */}
      <div className="form-actionbar">
        <Link className="btn btn-secondary" to={`/${config.route}`}><X size={18} /> Cancel</Link>
        <button className="btn btn-primary" type="submit" form="resource-form" disabled={saving || loading}>
          <Save size={18} /> {saving ? 'Saving...' : `Save ${config.singular}`}
        </button>
      </div>

      {loading ? <section className="panel empty-panel"><strong>Loading data...</strong></section> : (
        <form id="resource-form" className="project-editor editor-console" onSubmit={saveItem} onInvalid={revealInvalidTab}>
          {isExperience ? (
            <>
              <div className="editor-main studio">
                <div className="studio-tabs" role="tablist" aria-label="Experience sections" onKeyDown={handleTabKeyDown}>
                  <button
                    id="etable-role"
                    type="button"
                    role="tab"
                    aria-controls="etab-role"
                    aria-selected={activeTab === 'role'}
                    className={`studio-tab ${activeTab === 'role' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('role')}
                  >
                    Role &amp; Timeline
                  </button>
                  <button
                    id="etable-desc"
                    type="button"
                    role="tab"
                    aria-controls="etab-desc"
                    aria-selected={activeTab === 'desc'}
                    className={`studio-tab ${activeTab === 'desc' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('desc')}
                  >
                    Description &amp; Highlights
                  </button>
                </div>

                <section id="etab-role" role="tabpanel" aria-labelledby="etable-role" data-tab-panel="role" className="tab-panel" hidden={activeTab !== 'role'}>
                  <div className="editor-section-header">
                    <div>
                      <span>// experiences.source</span>
                      <h2>{dynamicTitle}</h2>
                    </div>
                    <span className="status-line">{isEditing ? 'EDIT MODE' : 'NEW RECORD'}</span>
                  </div>

                  <div className="form-grid copy-grid is-split">
                    <label className="form-field"><span>Company</span><input value={form.company_name ?? ''} onChange={(event) => updateField('company_name', event.target.value)} required /></label>
                    <label className="form-field"><span>Role</span><input value={form.role ?? ''} onChange={(event) => updateField('role', event.target.value)} required /></label>
                    <div className="form-field">
                      <label htmlFor="exp-work-model">Work Model</label>
                      <input id="exp-work-model" value={form.work_model ?? ''} onChange={(event) => updateField('work_model', event.target.value)} />
                      <div className="preset-pills">
                        {WORK_MODELS.map((model) => (
                          <button
                            key={model}
                            type="button"
                            className={`preset-pill ${form.work_model === model ? 'is-active' : ''}`}
                            aria-pressed={form.work_model === model}
                            onClick={() => updateField('work_model', model)}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="form-field"><span>Location</span><input value={form.location ?? ''} onChange={(event) => updateField('location', event.target.value)} /></label>
                    <label className="form-field"><span>Start Date</span><input type="date" value={form.start_date ?? ''} onChange={(event) => updateField('start_date', event.target.value)} /></label>
                    <label className="form-field">
                      <span>End Date {form.is_current && <em className="present-badge">Present</em>}</span>
                      <input type="date" value={form.end_date ?? ''} onChange={(event) => updateField('end_date', event.target.value)} disabled={Boolean(form.is_current)} />
                    </label>
                  </div>

                  <label className="form-field">
                    <span>Skills</span>
                    <input value={form.skillsText ?? ''} onChange={(event) => updateField('skillsText', event.target.value)} placeholder="React, TypeScript, Leadership" />
                  </label>
                  {skills.length > 0 && (
                    <div className="stack-chips" aria-live="polite">
                      {skills.map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}
                    </div>
                  )}
                </section>

                <section id="etab-desc" role="tabpanel" aria-labelledby="etable-desc" data-tab-panel="desc" className="tab-panel" hidden={activeTab !== 'desc'}>
                  <div className="editor-section-header compact"><div><span>// i18n</span><h2>Description &amp; Highlights</h2></div></div>

                  <div className="lang-switch" role="group" aria-label="Language view">
                    <button type="button" className={`lang-pill ${langView === 'id' ? 'is-active' : ''}`} aria-pressed={langView === 'id'} onClick={() => setLangView('id')}>ID</button>
                    <button type="button" className={`lang-pill ${langView === 'en' ? 'is-active' : ''}`} aria-pressed={langView === 'en'} onClick={() => setLangView('en')}>EN</button>
                    <button type="button" className={`lang-pill ${langView === 'split' ? 'is-active' : ''}`} aria-pressed={langView === 'split'} onClick={() => setLangView('split')}>Split View</button>
                  </div>

                  <div className={`form-grid copy-grid ${langView === 'split' ? 'is-split' : ''}`}>
                    <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Description ID</span><textarea rows="4" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
                    <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Description EN</span><textarea rows="4" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
                    <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}>
                      <span>Highlights ID <em className="line-badge">{countLines(form.translations.id.highlightsText)} lines</em></span>
                      <textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" />
                    </label>
                    <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}>
                      <span>Highlights EN <em className="line-badge">{countLines(form.translations.en.highlightsText)} lines</em></span>
                      <textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="editor-side panel commit-panel publish-panel">
                <div className="editor-section-header compact"><div><span>// meta</span><h2>Publishing</h2></div></div>
                <label className="form-field">
                  <span>Status</span>
                  <div className="status-control">
                    <span className={`status-dot status-dot-${form.status ?? 'draft'}`} aria-hidden="true" />
                    <select value={form.status ?? 'draft'} onChange={(event) => updateField('status', event.target.value)}><option value="draft">draft</option><option value="published">published</option></select>
                  </div>
                </label>
                <label className="form-field"><span>Sort Order</span><input type="number" value={form.sort_order ?? 0} onChange={(event) => updateField('sort_order', event.target.value)} /></label>
                <label className="switch-row">
                  <input type="checkbox" checked={Boolean(form.is_current)} onChange={(event) => toggleCurrentRole(event.target.checked)} />
                  <span className="switch-track" aria-hidden="true"><i /></span>
                  <em>Current role</em>
                </label>

                <div className="preview-card">
                  <span className="preview-eyebrow">Live Timeline Preview</span>
                  <div className="preview-range">{dateRange}</div>
                  <div className="preview-meta">
                    {form.work_model && <span className="preview-chip">{form.work_model}</span>}
                    {form.location && <span className="preview-location">{form.location}</span>}
                  </div>
                  <strong className="preview-role">{form.role || 'Untitled Role'}</strong>
                  <span className="preview-company">{form.company_name || 'Company name'}</span>
                  {previewSnippet && <p className="preview-desc">{previewSnippet}</p>}
                  {skills.length > 0 && (
                    <div className="stack-chips">
                      {skills.map((skill, index) => <span key={`preview-${skill}-${index}`}>{skill}</span>)}
                    </div>
                  )}
                </div>
              </aside>
            </>
          ) : isEducation ? (
            <>
              <div className="editor-main studio">
                <div className="studio-tabs" role="tablist" aria-label="Education sections" onKeyDown={handleTabKeyDown}>
                  <button
                    id="etable-info"
                    type="button"
                    role="tab"
                    aria-controls="etab-info"
                    aria-selected={activeTab === 'info'}
                    className={`studio-tab ${activeTab === 'info' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('info')}
                  >
                    Academic Info &amp; Logo
                  </button>
                  <button
                    id="etable-desc"
                    type="button"
                    role="tab"
                    aria-controls="etab-desc"
                    aria-selected={activeTab === 'desc'}
                    className={`studio-tab ${activeTab === 'desc' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('desc')}
                  >
                    Description &amp; Highlights
                  </button>
                </div>

                <section id="etab-info" role="tabpanel" aria-labelledby="etable-info" data-tab-panel="info" className="tab-panel" hidden={activeTab !== 'info'}>
                  <div className="editor-section-header">
                    <div>
                      <span>// educations.source</span>
                      <h2>{educationTitle}</h2>
                    </div>
                    <span className="status-line">{isEditing ? 'EDIT MODE' : 'NEW RECORD'}</span>
                  </div>

                  {config.imageField && (
                    <div className="logo-strip">
                      <div className="logo-slot">
                        {imagePreview ? <img src={imagePreview} alt="" loading="lazy" decoding="async" /> : <GraduationCap size={30} />}
                      </div>
                      <div className="logo-meta">
                        <strong>{config.imageField.label}</strong>
                        <span>PNG, SVG, JPG · Square 1:1 recommended</span>
                      </div>
                      <label className="upload-pick">
                        <ImagePlus size={16} />
                        <span>{imagePreview ? 'Replace Logo' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" onChange={(event) => updateImage(event.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  )}

                  <div className="form-grid copy-grid is-split">
                    <label className="form-field"><span>Institution</span><input value={form.institution_name ?? ''} onChange={(event) => updateField('institution_name', event.target.value)} required /></label>
                    <div className="form-field">
                      <label htmlFor="edu-degree">Degree</label>
                      <input id="edu-degree" value={form.degree ?? ''} onChange={(event) => updateField('degree', event.target.value)} />
                      <div className="preset-pills">
                        {DEGREE_PRESETS.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            className={`preset-pill ${form.degree === preset ? 'is-active' : ''}`}
                            aria-pressed={form.degree === preset}
                            onClick={() => updateField('degree', preset)}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                    <label className="form-field"><span>Field of Study</span><input value={form.field_of_study ?? ''} onChange={(event) => updateField('field_of_study', event.target.value)} /></label>
                    <label className="form-field"><span>Location</span><input value={form.location ?? ''} onChange={(event) => updateField('location', event.target.value)} /></label>
                    <label className="form-field"><span>Start Date</span><input type="date" value={form.start_date ?? ''} onChange={(event) => updateField('start_date', event.target.value)} /></label>
                    <label className="form-field"><span>End Date</span><input type="date" value={form.end_date ?? ''} onChange={(event) => updateField('end_date', event.target.value)} /></label>
                  </div>
                </section>

                <section id="etab-desc" role="tabpanel" aria-labelledby="etable-desc" data-tab-panel="desc" className="tab-panel" hidden={activeTab !== 'desc'}>
                  <div className="editor-section-header compact"><div><span>// i18n</span><h2>Description &amp; Highlights</h2></div></div>

                  <div className="lang-switch" role="group" aria-label="Language view">
                    <button type="button" className={`lang-pill ${langView === 'id' ? 'is-active' : ''}`} aria-pressed={langView === 'id'} onClick={() => setLangView('id')}>ID</button>
                    <button type="button" className={`lang-pill ${langView === 'en' ? 'is-active' : ''}`} aria-pressed={langView === 'en'} onClick={() => setLangView('en')}>EN</button>
                    <button type="button" className={`lang-pill ${langView === 'split' ? 'is-active' : ''}`} aria-pressed={langView === 'split'} onClick={() => setLangView('split')}>Split View</button>
                  </div>

                  <div className={`form-grid copy-grid ${langView === 'split' ? 'is-split' : ''}`}>
                    <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Description ID</span><textarea rows="4" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
                    <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Description EN</span><textarea rows="4" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
                    <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}>
                      <span>Highlights ID <em className="line-badge">{countLines(form.translations.id.highlightsText)} lines</em></span>
                      <textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" />
                    </label>
                    <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}>
                      <span>Highlights EN <em className="line-badge">{countLines(form.translations.en.highlightsText)} lines</em></span>
                      <textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="editor-side panel commit-panel publish-panel">
                <div className="editor-section-header compact"><div><span>// meta</span><h2>Publishing</h2></div></div>
                <label className="form-field">
                  <span>Status</span>
                  <div className="status-control">
                    <span className={`status-dot status-dot-${form.status ?? 'draft'}`} aria-hidden="true" />
                    <select value={form.status ?? 'draft'} onChange={(event) => updateField('status', event.target.value)}><option value="draft">draft</option><option value="published">published</option></select>
                  </div>
                </label>
                <label className="form-field"><span>Sort Order</span><input type="number" value={form.sort_order ?? 0} onChange={(event) => updateField('sort_order', event.target.value)} /></label>

                <div className="preview-card">
                  <span className="preview-eyebrow">Live Orbital Card Preview</span>
                  <div className="edu-preview-head">
                    <div className="edu-logo">
                      {imagePreview ? <img src={imagePreview} alt="" loading="lazy" decoding="async" /> : <GraduationCap size={18} />}
                    </div>
                    <div className="edu-preview-id">
                      <strong className="preview-role">{form.degree || 'Degree'}</strong>
                      <span className="preview-company">{form.institution_name || 'Institution'}</span>
                    </div>
                  </div>
                  {form.field_of_study && <span className="preview-location">{form.field_of_study}</span>}
                  <div className="preview-range">{educationRange}</div>
                  {form.location && <span className="preview-location">{form.location}</span>}
                  {educationHighlights.length > 0 && (
                    <div className="stack-chips">
                      {educationHighlights.map((highlight, index) => <span key={`edu-hl-${index}`}>{highlight}</span>)}
                    </div>
                  )}
                </div>
              </aside>
            </>
          ) : isCertification ? (
            <>
              <div className="editor-main studio">
                <div className="studio-tabs" role="tablist" aria-label="Certification sections" onKeyDown={handleTabKeyDown}>
                  <button
                    id="etable-credential"
                    type="button"
                    role="tab"
                    aria-controls="etab-credential"
                    aria-selected={activeTab === 'credential'}
                    className={`studio-tab ${activeTab === 'credential' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('credential')}
                  >
                    Credential &amp; Badge
                  </button>
                  <button
                    id="etable-desc"
                    type="button"
                    role="tab"
                    aria-controls="etab-desc"
                    aria-selected={activeTab === 'desc'}
                    className={`studio-tab ${activeTab === 'desc' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('desc')}
                  >
                    Description &amp; Highlights
                  </button>
                </div>

                <section id="etab-credential" role="tabpanel" aria-labelledby="etable-credential" data-tab-panel="credential" className="tab-panel" hidden={activeTab !== 'credential'}>
                  <div className="editor-section-header">
                    <div>
                      <span>// certifications.source</span>
                      <h2>{certificationTitle}</h2>
                    </div>
                    <span className="status-line">{isEditing ? 'EDIT MODE' : 'NEW RECORD'}</span>
                  </div>

                  {config.imageField && (
                    <div className="logo-strip">
                      <div className="logo-slot">
                        {imagePreview ? <img src={imagePreview} alt="" loading="lazy" decoding="async" /> : <Trophy size={30} />}
                      </div>
                      <div className="logo-meta">
                        <strong>{config.imageField.label}</strong>
                        <span>PNG, SVG, JPG · Square 1:1 badge recommended</span>
                      </div>
                      <label className="upload-pick">
                        <ImagePlus size={16} />
                        <span>{imagePreview ? 'Replace Image' : 'Upload Image'}</span>
                        <input type="file" accept="image/*" onChange={(event) => updateImage(event.target.files?.[0] ?? null)} />
                      </label>
                    </div>
                  )}

                  <div className="form-grid copy-grid is-split">
                    <label className="form-field"><span>Certification Name</span><input value={form.name ?? ''} onChange={(event) => updateField('name', event.target.value)} required /></label>
                    <label className="form-field"><span>Issuer</span><input value={form.issuer ?? ''} onChange={(event) => updateField('issuer', event.target.value)} /></label>
                    <label className="form-field"><span>Credential ID</span><input value={form.credential_id ?? ''} onChange={(event) => updateField('credential_id', event.target.value)} /></label>
                    <div className="form-field">
                      <label htmlFor="cert-credential-url">Credential URL</label>
                      <div className="field-icon">
                        <Globe2 size={16} />
                        <input id="cert-credential-url" type="url" value={form.credential_url ?? ''} onChange={(event) => updateField('credential_url', event.target.value)} placeholder="https://..." />
                        <a
                          className="field-action"
                          href={form.credential_url || undefined}
                          target="_blank"
                          rel="noreferrer"
                          aria-disabled={form.credential_url ? 'false' : 'true'}
                          aria-label="Test credential link"
                        >
                          <ExternalLink size={12} /> Test
                        </a>
                      </div>
                    </div>
                    <label className="form-field"><span>Issued At</span><input type="date" value={form.issued_at ?? ''} onChange={(event) => updateField('issued_at', event.target.value)} /></label>
                    <label className="form-field">
                      <span>Expires At {noExpiry && <em className="present-badge">Lifetime</em>}</span>
                      <input type="date" value={form.expires_at ?? ''} onChange={(event) => updateField('expires_at', event.target.value)} disabled={noExpiry} />
                    </label>
                  </div>

                  <label className="switch-row">
                    <input type="checkbox" checked={noExpiry} onChange={(event) => toggleNoExpiry(event.target.checked)} />
                    <span className="switch-track" aria-hidden="true"><i /></span>
                    <em>No expiration / lifetime credential</em>
                  </label>

                  <label className="form-field">
                    <span>Skills</span>
                    <input value={form.skillsText ?? ''} onChange={(event) => updateField('skillsText', event.target.value)} placeholder="React, Cloud, Security" />
                  </label>
                  {skills.length > 0 && (
                    <div className="stack-chips" aria-live="polite">
                      {skills.map((skill, index) => <span key={`cert-skill-${skill}-${index}`}>{skill}</span>)}
                    </div>
                  )}
                </section>

                <section id="etab-desc" role="tabpanel" aria-labelledby="etable-desc" data-tab-panel="desc" className="tab-panel" hidden={activeTab !== 'desc'}>
                  <div className="editor-section-header compact"><div><span>// i18n</span><h2>Description &amp; Highlights</h2></div></div>

                  <div className="lang-switch" role="group" aria-label="Language view">
                    <button type="button" className={`lang-pill ${langView === 'id' ? 'is-active' : ''}`} aria-pressed={langView === 'id'} onClick={() => setLangView('id')}>ID</button>
                    <button type="button" className={`lang-pill ${langView === 'en' ? 'is-active' : ''}`} aria-pressed={langView === 'en'} onClick={() => setLangView('en')}>EN</button>
                    <button type="button" className={`lang-pill ${langView === 'split' ? 'is-active' : ''}`} aria-pressed={langView === 'split'} onClick={() => setLangView('split')}>Split View</button>
                  </div>

                  <div className={`form-grid copy-grid ${langView === 'split' ? 'is-split' : ''}`}>
                    <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Description ID</span><textarea rows="4" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
                    <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Description EN</span><textarea rows="4" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
                    <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}>
                      <span>Highlights ID <em className="line-badge">{countLines(form.translations.id.highlightsText)} lines</em></span>
                      <textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" />
                    </label>
                    <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}>
                      <span>Highlights EN <em className="line-badge">{countLines(form.translations.en.highlightsText)} lines</em></span>
                      <textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" />
                    </label>
                  </div>
                </section>
              </div>

              <aside className="editor-side panel commit-panel publish-panel">
                <div className="editor-section-header compact"><div><span>// meta</span><h2>Publishing</h2></div></div>
                <label className="form-field">
                  <span>Status</span>
                  <div className="status-control">
                    <span className={`status-dot status-dot-${form.status ?? 'draft'}`} aria-hidden="true" />
                    <select value={form.status ?? 'draft'} onChange={(event) => updateField('status', event.target.value)}><option value="draft">draft</option><option value="published">published</option></select>
                  </div>
                </label>
                <label className="form-field"><span>Sort Order</span><input type="number" value={form.sort_order ?? 0} onChange={(event) => updateField('sort_order', event.target.value)} /></label>

                <div className="preview-card">
                  <span className="preview-eyebrow">Live Credential Card Preview</span>
                  <div className="edu-preview-head">
                    <div className="preview-logo">
                      {imagePreview ? <img src={imagePreview} alt="" loading="lazy" decoding="async" /> : <Trophy size={18} />}
                    </div>
                    <div className="edu-preview-id">
                      <strong className="preview-role">{form.name || 'Certification'}</strong>
                      <span className="preview-company">{form.issuer || 'Issuer'}</span>
                    </div>
                  </div>
                  {form.credential_id && <span className="preview-id-pill">ID: {form.credential_id}</span>}
                  <div className="preview-range">{certificationDates}</div>
                  {form.credential_url && (
                    <span className="preview-verified"><ExternalLink size={11} /> Verified link</span>
                  )}
                  {skills.length > 0 && (
                    <div className="stack-chips">
                      {skills.map((skill, index) => <span key={`cert-preview-${skill}-${index}`}>{skill}</span>)}
                    </div>
                  )}
                </div>
              </aside>
            </>
          ) : (
            <>
              <div className="editor-main">
                <div className="editor-section-header">
                  <div>
                    <span>// {config.endpoint}.source</span>
                    <h2>{config.getTitle(form) || `Untitled ${config.singular}`}</h2>
                  </div>
                  <span className="status-line">{isEditing ? 'EDIT MODE' : 'NEW RECORD'}</span>
                </div>

                <div className="form-grid two-columns">
                  {config.fields.map(([field, label, inputType, required]) => (
                    <label className="form-field" key={field}>
                      <span>{label}</span>
                      <input type={inputType} value={form[field] ?? ''} onChange={(event) => updateField(field, event.target.value)} required={Boolean(required)} />
                    </label>
                  ))}
                </div>

                {config.imageField && (
                  <div className="gallery-editor">
                    <div className="editor-section-header compact"><div><span>// assets.logo</span><h2>{config.imageField.label}</h2></div></div>
                    <div className="hero-card">
                      <div className="hero-card-preview">
                        {imagePreview ? <img src={imagePreview} alt="" loading="lazy" decoding="async" /> : <div className="asset-empty"><ImagePlus size={32} /><span>No image yet</span></div>}
                      </div>
                      <div className="hero-card-controls">
                        <label className="upload-pick"><ImagePlus size={16} /><span>{imagePreview ? 'Replace Image' : 'Upload Image'}</span><input type="file" accept="image/*" onChange={(event) => updateImage(event.target.files?.[0] ?? null)} /></label>
                      </div>
                    </div>
                  </div>
                )}

                <div className="gallery-editor">
                  <div className="editor-section-header compact"><div><span>// i18n</span><h2>Description &amp; Highlights</h2></div></div>
                  <div className="form-grid two-columns">
                    <label className="form-field"><span>Description ID</span><textarea rows="5" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
                    <label className="form-field"><span>Description EN</span><textarea rows="5" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
                    <label className="form-field"><span>Highlights ID</span><textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
                    <label className="form-field"><span>Highlights EN</span><textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
                  </div>
                </div>
              </div>

              <aside className="editor-side panel commit-panel">
                <div className="editor-section-header compact"><div><span>// meta</span><h2>Publishing</h2></div></div>
                <label className="form-field"><span>Status</span><select value={form.status ?? 'draft'} onChange={(event) => updateField('status', event.target.value)}><option value="draft">draft</option><option value="published">published</option></select></label>
                {config.booleanFields.map(([field, label]) => (
                  <label className="switch-row" key={field}><input type="checkbox" checked={Boolean(form[field])} onChange={(event) => updateField(field, event.target.checked)} /><span className="switch-track" aria-hidden="true"><i /></span><em>{label}</em></label>
                ))}
              </aside>
            </>
          )}
        </form>
      )}
    </main>
  );
}
