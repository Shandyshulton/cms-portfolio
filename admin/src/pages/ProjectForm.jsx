import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, FolderGit2, Globe2, ImagePlus, Plus, Save, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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

const TAB_ORDER = ['content', 'assets', 'links'];

const TABS = [
  { id: 'content', label: 'Content & Copy' },
  { id: 'assets', label: 'Hero & Gallery' },
  { id: 'links', label: 'Links & Tech Stack' },
];

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
    thumbnail_url: image.thumbnail_url ?? '',
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
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeTab, setActiveTab] = useState('content');
  const [langView, setLangView] = useState('split');
  const [categories, setCategories] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [categoryActive, setCategoryActive] = useState(-1);
  const categoryRef = useRef(null);

  // Category suggestions come from existing projects (there is no categories
  // table). Newly typed categories appear here once a project saves them.
  useEffect(() => {
    let cancelled = false;

    apiRequest('/admin/projects?per_page=100')
      .then((payload) => {
        if (cancelled) return;
        const unique = [...new Set((payload.data ?? [])
          .map((project) => (project.category ?? '').trim())
          .filter(Boolean))];
        setCategories(unique.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {
        // Suggestions only — ignore failures so the form still works.
      });

    return () => { cancelled = true; };
  }, []);

  // Category combobox: close on outside click / Escape.
  useEffect(() => {
    if (!categoryOpen) return undefined;
    const onPointerDown = (event) => {
      if (!categoryRef.current?.contains(event.target)) setCategoryOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setCategoryOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [categoryOpen]);

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

  function selectCategory(value) {
    updateField('category', value);
    setCategoryOpen(false);
    setCategoryActive(-1);
  }

  function handleCategoryKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setCategoryOpen(true);
      setCategoryActive((index) => Math.min(index + 1, categoryOptions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setCategoryActive((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && categoryOpen && categoryActive >= 0 && categoryOptions[categoryActive]) {
      event.preventDefault();
      selectCategory(categoryOptions[categoryActive]);
    } else if (event.key === 'Escape') {
      setCategoryOpen(false);
    }
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
    setForm((current) => {
      const nextImages = [...current.galleryImages, { ...blankImage, sort_order: current.galleryImages.length }];
      setActiveSlide(nextImages.length - 1);
      return { ...current, galleryImages: nextImages };
    });
  }

  function removeGalleryImage(index) {
    setForm((current) => {
      const removed = current.galleryImages[index];
      if (removed?.preview_url) URL.revokeObjectURL(removed.preview_url);
      const nextImages = current.galleryImages.filter((_, imageIndex) => imageIndex !== index);
      setActiveSlide((slide) => Math.max(0, Math.min(slide, nextImages.length - 1)));
      return { ...current, galleryImages: nextImages };
    });
  }

  const galleryCount = form.galleryImages.length;
  const currentSlide = galleryCount ? Math.min(activeSlide, galleryCount - 1) : 0;
  const stackTags = form.stacksText.split(',').map((item) => item.trim()).filter(Boolean);
  const categoryQuery = (form.category ?? '').trim().toLowerCase();
  const categoryOptions = categoryQuery
    ? categories.filter((category) => category.toLowerCase().includes(categoryQuery))
    : categories;

  function goToSlide(index) {
    if (!galleryCount) return;
    const total = galleryCount;
    setActiveSlide(((index % total) + total) % total);
  }

  function handleTabKeyDown(event) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const current = TAB_ORDER.indexOf(activeTab);
    const step = event.key === 'ArrowRight' ? 1 : TAB_ORDER.length - 1;
    const next = TAB_ORDER[(current + step) % TAB_ORDER.length];
    setActiveTab(next);
    document.getElementById(`tabbtn-${next}`)?.focus();
  }

  // A hidden tab can hold a `required` control; reveal its tab so the browser
  // can focus it and show the native validation message.
  function revealInvalidTab(event) {
    const panel = event.target.closest?.('[data-tab-panel]');
    if (panel?.dataset.tabPanel) setActiveTab(panel.dataset.tabPanel);
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

  const heroPreview = form.heroImage.preview_url || form.heroImage.thumbnail_url || form.heroImage.image_url;

  return (
    <main className="content-page projects-page">
      <div className="form-sticky-head">
        <div className="form-head-main">
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

      {/* Sticky Save/Cancel bar for mobile (hidden on desktop via CSS) */}
      <div className="form-actionbar">
        <Link className="btn btn-secondary" to="/projects"><X size={18} /> Cancel</Link>
        <button className="btn btn-primary" type="submit" form="project-form" disabled={saving || loading}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Project'}
        </button>
      </div>

      {loading ? <section className="panel empty-panel"><strong>Loading project...</strong></section> : (
        <form id="project-form" className="project-editor editor-console" onSubmit={saveProject} onInvalid={revealInvalidTab}>
          <div className="editor-main studio">
            <div className="studio-tabs" role="tablist" aria-label="Project sections" onKeyDown={handleTabKeyDown}>
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  id={`tabbtn-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-controls={`tab-${tab.id}`}
                  aria-selected={activeTab === tab.id}
                  className={`studio-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                  {tab.id === 'assets' && <span className="tab-count">{galleryCount}</span>}
                </button>
              ))}
            </div>

            <section id="tab-content" role="tabpanel" aria-labelledby="tabbtn-content" data-tab-panel="content" className="tab-panel" hidden={activeTab !== 'content'}>
              <div className="editor-section-header">
                <div>
                  <span>// project.source</span>
                  <h2>{form.translations.id.title || 'Untitled project'}</h2>
                </div>
                <span className="status-line">{isEditing ? 'EDIT MODE' : 'NEW RECORD'}</span>
              </div>

              <div className="lang-switch" role="group" aria-label="Language view">
                <button type="button" className={`lang-pill ${langView === 'id' ? 'is-active' : ''}`} aria-pressed={langView === 'id'} onClick={() => setLangView('id')}>ID</button>
                <button type="button" className={`lang-pill ${langView === 'en' ? 'is-active' : ''}`} aria-pressed={langView === 'en'} onClick={() => setLangView('en')}>EN</button>
                <button type="button" className={`lang-pill ${langView === 'split' ? 'is-active' : ''}`} aria-pressed={langView === 'split'} onClick={() => setLangView('split')}>Split View</button>
              </div>

              <div className={`form-grid copy-grid ${langView === 'split' ? 'is-split' : ''}`}>
                <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Title ID</span><input value={form.translations.id.title} onChange={(event) => updateTranslation('id', 'title', event.target.value)} required /></label>
                <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Title EN</span><input value={form.translations.en.title} onChange={(event) => updateTranslation('en', 'title', event.target.value)} /></label>
                <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Summary ID</span><textarea rows="3" value={form.translations.id.summary} onChange={(event) => updateTranslation('id', 'summary', event.target.value)} /></label>
                <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Summary EN</span><textarea rows="3" value={form.translations.en.summary} onChange={(event) => updateTranslation('en', 'summary', event.target.value)} /></label>
                <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Description ID</span><textarea rows="4" value={form.translations.id.description} onChange={(event) => updateTranslation('id', 'description', event.target.value)} /></label>
                <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Description EN</span><textarea rows="4" value={form.translations.en.description} onChange={(event) => updateTranslation('en', 'description', event.target.value)} /></label>
                <label className={`form-field ${langView === 'en' ? 'is-hidden' : ''}`}><span>Highlights ID</span><textarea rows="4" value={form.translations.id.highlightsText} onChange={(event) => updateTranslation('id', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
                <label className={`form-field ${langView === 'id' ? 'is-hidden' : ''}`}><span>Highlights EN</span><textarea rows="4" value={form.translations.en.highlightsText} onChange={(event) => updateTranslation('en', 'highlightsText', event.target.value)} placeholder="One highlight per line" /></label>
              </div>
            </section>

            <section id="tab-assets" role="tabpanel" aria-labelledby="tabbtn-assets" data-tab-panel="assets" className="tab-panel" hidden={activeTab !== 'assets'}>
              <div className="editor-section-header compact"><div><span>// assets.hero</span><h2>Hero Image</h2></div></div>
              <div className="hero-card">
                <div className="hero-card-preview">
                  {heroPreview ? <img src={heroPreview} alt="" loading="lazy" decoding="async" /> : <div className="asset-empty"><ImagePlus size={32} /><span>No hero image yet</span></div>}
                </div>
                <div className="hero-card-controls">
                  <label className="upload-pick"><ImagePlus size={16} /><span>{heroPreview ? 'Replace Hero Image' : 'Upload Hero Image'}</span><input type="file" accept="image/*" onChange={(event) => updateHeroFile(event.target.files?.[0] ?? null)} /></label>
                  <label className="form-field"><span>Alt Text</span><input value={form.heroImage.alt_text} onChange={(event) => updateHero('alt_text', event.target.value)} placeholder="Describe the hero image" /></label>
                  <label className="form-field"><span>Caption</span><input value={form.heroImage.caption} onChange={(event) => updateHero('caption', event.target.value)} placeholder="Optional caption" /></label>
                </div>
              </div>

              <div className="gallery-editor">
                <div className="editor-section-header compact">
                  <div><span>// assets.gallery</span><h2>Gallery Images</h2></div>
                  <button className="btn btn-secondary" type="button" onClick={addGalleryImage}><Plus size={18} /> Add Image</button>
                </div>

                {galleryCount === 0 ? (
                  <div className="gallery-empty">
                    <ImagePlus size={30} />
                    <strong>No gallery images</strong>
                    <p>Add images to build the project gallery.</p>
                    <button className="btn btn-primary" type="button" onClick={addGalleryImage}><Plus size={16} /> Add first image</button>
                  </div>
                ) : (
                  <div className="gallery-carousel">
                    <div className="carousel-stage">
                      {form.galleryImages.map((image, index) => {
                        if (index !== currentSlide) return null;
                        const preview = image.preview_url || image.thumbnail_url || image.image_url;
                        return (
                          <div className="carousel-slide" key={`slide-${index}-${image.id ?? 'new'}`}>
                            <div className="carousel-preview">
                              {preview ? <img src={preview} alt="" loading="lazy" decoding="async" /> : <div className="asset-empty"><ImagePlus size={28} /><span>No image selected</span></div>}
                              <span className="carousel-counter">{currentSlide + 1} / {galleryCount}</span>
                              <button className="carousel-remove" type="button" onClick={() => removeGalleryImage(index)} aria-label="Remove image"><Trash2 size={16} /></button>
                              {galleryCount > 1 && (
                                <>
                                  <button className="carousel-nav prev" type="button" onClick={() => goToSlide(currentSlide - 1)} aria-label="Previous image"><ChevronLeft size={22} /></button>
                                  <button className="carousel-nav next" type="button" onClick={() => goToSlide(currentSlide + 1)} aria-label="Next image"><ChevronRight size={22} /></button>
                                </>
                              )}
                            </div>
                            <div className="carousel-fields">
                              <label className="upload-pick"><ImagePlus size={16} /><span>{preview ? 'Replace Image' : 'Upload Image'}</span><input type="file" accept="image/*" onChange={(event) => updateGalleryFile(index, event.target.files?.[0] ?? null)} /></label>
                              <label className="form-field"><span>Alt Text</span><input value={image.alt_text} onChange={(event) => updateGallery(index, 'alt_text', event.target.value)} placeholder="Describe this image" /></label>
                              <label className="form-field"><span>Caption</span><input value={image.caption} onChange={(event) => updateGallery(index, 'caption', event.target.value)} placeholder="Optional caption" /></label>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="carousel-thumbs" role="tablist" aria-label="Gallery slides">
                      {form.galleryImages.map((image, index) => {
                        const thumb = image.preview_url || image.thumbnail_url || image.image_url;
                        return (
                          <button
                            key={`thumb-${index}-${image.id ?? 'new'}`}
                            type="button"
                            role="tab"
                            aria-selected={index === currentSlide}
                            className={`carousel-thumb ${index === currentSlide ? 'active' : ''}`}
                            onClick={() => goToSlide(index)}
                            aria-label={`Go to image ${index + 1}`}
                          >
                            {thumb ? <img src={thumb} alt="" loading="lazy" decoding="async" /> : <ImagePlus size={16} />}
                          </button>
                        );
                      })}
                      <button className="carousel-thumb add" type="button" onClick={addGalleryImage} aria-label="Add image"><Plus size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section id="tab-links" role="tabpanel" aria-labelledby="tabbtn-links" data-tab-panel="links" className="tab-panel" hidden={activeTab !== 'links'}>
              <div className="editor-section-header compact"><div><span>// links.target</span><h2>Links</h2></div></div>
              <div className="form-grid">
                <label className="form-field">
                  <span>Production URL</span>
                  <div className="field-icon">
                    <Globe2 size={16} />
                    <input value={form.live_url} onChange={(event) => updateField('live_url', event.target.value)} placeholder="https://..." />
                  </div>
                </label>
                <label className="form-field">
                  <span>Repository URL</span>
                  <div className="field-icon">
                    <FolderGit2 size={16} />
                    <input value={form.repository_url} onChange={(event) => updateField('repository_url', event.target.value)} placeholder="https://github.com/..." />
                  </div>
                </label>
              </div>

              <div className="editor-section-header compact"><div><span>// stack.tech</span><h2>Tech Stack</h2></div></div>
              <label className="form-field">
                <span>Stack</span>
                <input value={form.stacksText} onChange={(event) => updateField('stacksText', event.target.value)} placeholder="React, Laravel, MySQL" />
              </label>
              {stackTags.length > 0 && (
                <div className="stack-chips" aria-live="polite">
                  {stackTags.map((tag, index) => <span key={`${tag}-${index}`}>{tag}</span>)}
                </div>
              )}
            </section>
          </div>

          <aside className="editor-side panel commit-panel publish-panel">
            <div className="editor-section-header compact"><div><span>// meta</span><h2>Publishing</h2></div></div>
            <label className="form-field"><span>Slug</span><input value={form.slug} onChange={(event) => updateField('slug', event.target.value)} placeholder="auto from title" /></label>
            <label className="form-field"><span>Client / Role</span><input value={form.client_name} onChange={(event) => updateField('client_name', event.target.value)} /></label>
            <div className="form-field" ref={categoryRef}>
              <label htmlFor="project-category">Category</label>
              <div className="combo">
                <input
                  id="project-category"
                  type="text"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  aria-controls="project-category-menu"
                  aria-autocomplete="list"
                  autoComplete="off"
                  value={form.category}
                  onChange={(event) => {
                    updateField('category', event.target.value);
                    setCategoryOpen(true);
                    setCategoryActive(-1);
                  }}
                  onFocus={() => setCategoryOpen(true)}
                  onKeyDown={handleCategoryKeyDown}
                  placeholder="Pick one or type a new category"
                />
                <button
                  type="button"
                  className="combo-toggle"
                  aria-label="Show category options"
                  aria-expanded={categoryOpen}
                  onClick={() => setCategoryOpen((open) => !open)}
                >
                  <ChevronDown size={16} />
                </button>

                {categoryOpen && (
                  <div className="combo-menu" id="project-category-menu" role="listbox" aria-label="Categories">
                    {categoryOptions.length === 0 ? (
                      <span className="combo-empty">
                        {categories.length === 0
                          ? 'Belum ada kategori — ketik lalu simpan untuk membuat baru.'
                          : 'Tidak ada yang cocok — ketik lalu simpan untuk membuat kategori baru.'}
                      </span>
                    ) : categoryOptions.map((category, index) => (
                      <button
                        key={category}
                        type="button"
                        role="option"
                        aria-selected={form.category === category}
                        className={`combo-option ${index === categoryActive ? 'is-active' : ''}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="field-hint">Pick an existing category or type a new one to add it.</span>
            </div>
            <label className="form-field">
              <span>Status</span>
              <div className="status-control">
                <span className={`status-dot status-dot-${form.status}`} aria-hidden="true" />
                <select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option value="draft">draft</option><option value="published">published</option></select>
              </div>
            </label>
            <label className="form-field"><span>Sort Order</span><input type="number" value={form.sort_order} onChange={(event) => updateField('sort_order', event.target.value)} /></label>
            <label className="switch-row"><input type="checkbox" checked={form.is_featured} onChange={(event) => updateField('is_featured', event.target.checked)} /><span className="switch-track" aria-hidden="true"><i /></span><em>Featured project</em></label>
          </aside>
        </form>
      )}
    </main>
  );
}
