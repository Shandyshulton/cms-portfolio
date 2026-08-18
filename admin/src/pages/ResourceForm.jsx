import { ArrowLeft, ImagePlus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';
import { baseForm, moduleConfigs } from '../lib/module-configs.js';

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

  return (
    <main className="content-page projects-page">
      <div className="page-heading-row">
        <div>
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

      {error && <div className="notice notice-error">{error}</div>}
      {loading ? <section className="panel empty-panel"><strong>Loading data...</strong></section> : (
        <form id="resource-form" className="project-editor" onSubmit={saveItem}>
          <div className="editor-main">
            <div className="editor-section-header">
              <div>
                <span>{isEditing ? 'Edit Record' : 'Create Record'}</span>
                <h2>{config.getTitle(form) || `Untitled ${config.singular}`}</h2>
              </div>
            </div>

            <div className="form-grid two-columns">
              {config.fields.map(([field, label, inputType, required]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input type={inputType} value={form[field] ?? ''} onChange={(event) => updateField(field, event.target.value)} required={Boolean(required)} />
                </label>
              ))}
            </div>

            {config.imageField && (
              <div className="gallery-editor">
                <div className="editor-section-header compact"><div><span>Image Asset</span><h2>{config.imageField.label}</h2></div></div>
                <div className="single-upload-row">
                  <div className="image-preview">{imagePreview ? <img src={imagePreview} alt="" /> : <ImagePlus size={22} />}</div>
                  <label><span>Upload Image</span><input type="file" accept="image/*" onChange={(event) => updateImage(event.target.files?.[0] ?? null)} /></label>
                </div>
              </div>
            )}

            <div className="gallery-editor">
              <div className="editor-section-header compact"><div><span>Bilingual Detail</span><h2>Description & Highlights</h2></div></div>
              <div className="form-grid two-columns">
                <label><span>Description ID</span><textarea rows="5" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
                <label><span>Description EN</span><textarea rows="5" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
                <label><span>Highlights ID</span><textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
                <label><span>Highlights EN</span><textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
              </div>
            </div>
          </div>

          <aside className="editor-side panel">
            <h2>Publishing</h2>
            <label><span>Status</span><select value={form.status ?? 'draft'} onChange={(event) => updateField('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
            {config.booleanFields.map(([field, label]) => (
              <label className="toggle-row" key={field}><input type="checkbox" checked={Boolean(form[field])} onChange={(event) => updateField(field, event.target.checked)} /> {label}</label>
            ))}
          </aside>
        </form>
      )}
    </main>
  );
}
