import { ArrowLeft, ImagePlus, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../lib/api.js';

const blankImage = { id: null, image_url: '', file: null, preview_url: '', alt_text: '', caption: '', sort_order: 0 };
const blankProject = {
  id: null,
  slug: '',
  client_name: '',
  category: '',
  status: 'draft',
  is_featured: false,
  stacksText: '',
  live_url: '',
  repository_url: '',
  sort_order: 0,
  translations: {
    id: { title: '', summary: '', description: '', highlightsText: '' },
    en: { title: '', summary: '', description: '', highlightsText: '' },
  },
  heroImage: { ...blankImage },
  galleryImages: [],
};

function localeMap(translations = []) {
  return translations.reduce((acc, translation) => {
    acc[translation.locale] = {
      title: translation.title ?? '',
      summary: translation.summary ?? '',
      description: translation.description ?? '',
      highlightsText: (translation.highlights ?? []).join('\n'),
    };
    return acc;
  }, {});
}

function imageToForm(image) {
  return image ? {
    id: image.id,
    image_url: image.image_url ?? '',
    file: null,
    preview_url: '',
    alt_text: image.alt_text ?? '',
    caption: image.caption ?? '',
    sort_order: image.sort_order ?? 0,
  } : { ...blankImage };
}

function toFormProject(project) {
  const translations = localeMap(project.translations);
  const hero = project.images?.find((image) => image.image_type === 'hero') ?? project.images?.find((image) => image.is_cover);
  const gallery = (project.images ?? []).filter((image) => image.image_type === 'gallery' || (!image.image_type && !image.is_cover));

  return {
    id: project.id,
    slug: project.slug ?? '',
    client_name: project.client_name ?? '',
    category: project.category ?? '',
    status: project.status ?? 'draft',
    is_featured: Boolean(project.is_featured),
    stacksText: (project.stacks ?? []).join(', '),
    live_url: project.live_url ?? '',
    repository_url: project.repository_url ?? '',
    sort_order: project.sort_order ?? 0,
    translations: {
      id: translations.id ?? { title: '', summary: '', description: '', highlightsText: '' },
      en: translations.en ?? { title: '', summary: '', description: '', highlightsText: '' },
    },
    heroImage: imageToForm(hero),
    galleryImages: gallery.map(imageToForm),
  };
}

function splitLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function imagePayload(image, sortOrder = 0) {
  return {
    id: image.id || null,
    alt_text: image.alt_text || null,
    caption: image.caption || null,
    sort_order: Number(image.sort_order) || sortOrder,
  };
}

function buildPayload(form) {
  return {
    slug: form.slug || undefined,
    client_name: form.client_name || null,
    category: form.category || null,
    status: form.status,
    is_featured: form.is_featured,
    stacks: form.stacksText.split(',').map((item) => item.trim()).filter(Boolean),
    live_url: form.live_url || null,
    repository_url: form.repository_url || null,
    sort_order: Number(form.sort_order) || 0,
    translations: {
      id: {
        title: form.translations.id.title,
        summary: form.translations.id.summary || null,
        description: form.translations.id.description || null,
        highlights: splitLines(form.translations.id.highlightsText),
      },
      en: {
        title: form.translations.en.title || null,
        summary: form.translations.en.summary || null,
        description: form.translations.en.description || null,
        highlights: splitLines(form.translations.en.highlightsText),
      },
    },
    hero_image: form.heroImage.file || form.heroImage.id ? imagePayload(form.heroImage, 0) : null,
    gallery_images: form.galleryImages.filter((image) => image.file || image.id).map((image, index) => imagePayload(image, index)),
  };
}

function buildProjectFormData(form) {
  const formData = new FormData();
  formData.append('payload', JSON.stringify(buildPayload(form)));

  if (form.heroImage.file) {
    formData.append('hero_image[file]', form.heroImage.file);
  }

  form.galleryImages.filter((image) => image.file || image.id).forEach((image, index) => {
    if (image.file) {
      formData.append(`gallery_images[${index}][file]`, image.file);
    }
  });

  return formData;
}

export default function ProjectForm() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(projectId);
  const [form, setForm] = useState(blankProject);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProject() {
      if (!isEditing) return;

      setLoading(true);
      setError('');
      try {
        const payload = await apiRequest(`/admin/projects/${projectId}`);
        setForm(toFormProject(payload.project));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [isEditing, projectId]);

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

  function updateHero(field, value) {
    setForm((current) => ({ ...current, heroImage: { ...current.heroImage, [field]: value } }));
  }

  function updateHeroFile(file) {
    setForm((current) => {
      if (current.heroImage.preview_url) URL.revokeObjectURL(current.heroImage.preview_url);
      return { ...current, heroImage: { ...current.heroImage, file, preview_url: file ? URL.createObjectURL(file) : '' } };
    });
  }

  function updateGallery(index, field, value) {
    setForm((current) => ({
      ...current,
      galleryImages: current.galleryImages.map((image, imageIndex) => imageIndex === index ? { ...image, [field]: value } : image),
    }));
  }

  function updateGalleryFile(index, file) {
    setForm((current) => ({
      ...current,
      galleryImages: current.galleryImages.map((image, imageIndex) => {
        if (imageIndex !== index) return image;
        if (image.preview_url) URL.revokeObjectURL(image.preview_url);
        return { ...image, file, preview_url: file ? URL.createObjectURL(file) : '' };
      }),
    }));
  }

  function addGalleryImage() {
    setForm((current) => ({
      ...current,
      galleryImages: [...current.galleryImages, { ...blankImage, sort_order: current.galleryImages.length }],
    }));
  }

  function removeGalleryImage(index) {
    setForm((current) => {
      const removed = current.galleryImages[index];
      if (removed?.preview_url) URL.revokeObjectURL(removed.preview_url);
      return { ...current, galleryImages: current.galleryImages.filter((_, imageIndex) => imageIndex !== index) };
    });
  }

  async function saveProject(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const body = buildProjectFormData(form);
      if (isEditing) body.append('_method', 'PUT');
      await apiRequest(isEditing ? `/admin/projects/${projectId}` : '/admin/projects', { method: 'POST', body });
      navigate('/projects');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const heroPreview = form.heroImage.preview_url || form.heroImage.image_url;

  return (
    <main className="content-page projects-page">
      <div className="page-heading-row">
        <div>
          <Link className="back-link" to="/projects"><ArrowLeft size={18} /> Back to Projects</Link>
          <h1>{isEditing ? 'Edit Project' : 'Create Project'}</h1>
          <p>{isEditing ? 'Update project copy, links, metadata, and gallery.' : 'Add a portfolio project with bilingual detail and multiple images.'}</p>
        </div>
        <div className="heading-actions">
          <Link className="btn btn-secondary" to="/projects"><X size={18} /> Cancel</Link>
          <button className="btn btn-primary" type="submit" form="project-form" disabled={saving || loading}>
            <Save size={18} /> {saving ? 'Saving...' : 'Save Project'}
          </button>
        </div>
      </div>

      {error && <div className="notice notice-error">{error}</div>}
      {loading ? <section className="panel empty-panel"><strong>Loading project...</strong></section> : (
        <form id="project-form" className="project-editor" onSubmit={saveProject}>
          <div className="editor-main">
            <div className="editor-section-header">
              <div>
                <span>{isEditing ? 'Edit Project' : 'Create Project'}</span>
                <h2>{form.translations.id.title || 'Untitled project'}</h2>
              </div>
            </div>

            <div className="form-grid two-columns">
              <label><span>Title ID</span><input value={form.translations.id.title} onChange={(event) => updateTranslation('id', 'title', event.target.value)} required /></label>
              <label><span>Title EN</span><input value={form.translations.en.title} onChange={(event) => updateTranslation('en', 'title', event.target.value)} /></label>
              <label><span>Summary ID</span><textarea value={form.translations.id.summary} onChange={(event) => updateTranslation('id', 'summary', event.target.value)} /></label>
              <label><span>Summary EN</span><textarea value={form.translations.en.summary} onChange={(event) => updateTranslation('en', 'summary', event.target.value)} /></label>
              <label><span>Description ID</span><textarea rows="5" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
              <label><span>Description EN</span><textarea rows="5" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
              <label><span>Highlights ID</span><textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
              <label><span>Highlights EN</span><textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
            </div>

            <div className="gallery-editor">
              <div className="editor-section-header compact"><div><span>Main Visual</span><h2>Hero Image</h2></div></div>
              <div className="image-row hero-image-row">
                <div className="image-preview hero-image-preview">{heroPreview ? <img src={heroPreview} alt="" /> : <ImagePlus size={28} />}</div>
                <label><span>Upload Hero Image</span><input type="file" accept="image/*" onChange={(event) => updateHeroFile(event.target.files?.[0] ?? null)} /></label>
                <label><span>Alt Text</span><input value={form.heroImage.alt_text} onChange={(event) => updateHero('alt_text', event.target.value)} /></label>
                <label><span>Caption</span><input value={form.heroImage.caption} onChange={(event) => updateHero('caption', event.target.value)} /></label>
              </div>
            </div>

            <div className="gallery-editor">
              <div className="editor-section-header compact">
                <div><span>Hero Gallery Slider</span><h2>Gallery Images</h2></div>
                <button className="btn btn-secondary" type="button" onClick={addGalleryImage}><ImagePlus size={18} /> Add Gallery Image</button>
              </div>
              {form.galleryImages.map((image, index) => {
                const preview = image.preview_url || image.image_url;
                return (
                  <div className="image-row" key={`${index}-${image.id ?? 'new'}`}>
                    <div className="image-preview">{preview ? <img src={preview} alt="" /> : <ImagePlus size={22} />}</div>
                    <label><span>Upload Gallery Image</span><input type="file" accept="image/*" onChange={(event) => updateGalleryFile(index, event.target.files?.[0] ?? null)} /></label>
                    <label><span>Alt Text</span><input value={image.alt_text} onChange={(event) => updateGallery(index, 'alt_text', event.target.value)} /></label>
                    <label><span>Caption</span><input value={image.caption} onChange={(event) => updateGallery(index, 'caption', event.target.value)} /></label>
                    <button className="icon-danger" type="button" onClick={() => removeGalleryImage(index)} aria-label="Remove image"><X size={18} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="editor-side panel">
            <h2>Publishing</h2>
            <label><span>Slug</span><input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="auto from title" /></label>
            <label><span>Client / Role</span><input value={form.client_name} onChange={(event) => updateField('client_name', event.target.value)} /></label>
            <label><span>Category</span><input value={form.category} onChange={(event) => updateField('category', event.target.value)} /></label>
            <label><span>Status</span><select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
            <label><span>Stack</span><input value={form.stacksText} onChange={(event) => updateField('stacksText', event.target.value)} placeholder="React, Laravel, MySQL" /></label>
            <label><span>Production URL</span><input value={form.live_url} onChange={(event) => updateField('live_url', event.target.value)} placeholder="https://..." /></label>
            <label><span>Repository URL</span><input value={form.repository_url} onChange={(event) => updateField('repository_url', event.target.value)} placeholder="https://github.com/..." /></label>
            <label><span>Sort Order</span><input type="number" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} /></label>
            <label className="toggle-row"><input type="checkbox" checked={form.is_featured} onChange={(event) => updateField('is_featured', event.target.checked)} /> Featured project</label>
          </aside>
        </form>
      )}
    </main>
  );
}
