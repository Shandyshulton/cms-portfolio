export const moduleConfigs = {
  experience: {
    route: 'experience', endpoint: 'experiences', responseKey: 'experience', title: 'Experience Management', singular: 'Experience', tableTitle: 'Work History', primaryColumn: 'Role', secondaryColumn: 'Model', metaColumn: 'Period',
    description: 'Manage professional history, responsibilities, skills, and bilingual career notes.',
    fields: [
      ['company_name', 'Company', 'text', true], ['role', 'Role', 'text', true], ['work_model', 'Work Model', 'text'], ['location', 'Location', 'text'], ['start_date', 'Start Date', 'date'], ['end_date', 'End Date', 'date'], ['skillsText', 'Skills', 'text'], ['sort_order', 'Sort Order', 'number'],
    ],
    booleanFields: [['is_current', 'Current role']],
    getTitle: (item) => item.role, getSubtitle: (item) => item.company_name, getSecondary: (item) => item.work_model ?? '-', getMeta: (item) => `${item.start_date ?? '-'} - ${item.is_current ? 'Present' : item.end_date ?? '-'}`, getLink: () => null,
    toPayload: (form) => ({ company_name: form.company_name, role: form.role, work_model: form.work_model || null, location: form.location || null, start_date: form.start_date || null, end_date: form.is_current ? null : form.end_date || null, is_current: form.is_current, status: form.status, skills: splitCsv(form.skillsText), translations: hydrateTranslations(form.translations), sort_order: Number(form.sort_order) || 0 }),
    toForm: (item) => ({ ...baseForm(), ...item, skillsText: (item.skills ?? []).join(', '), translations: normalizeTranslations(item.translations) }),
  },
  education: {
    route: 'education', endpoint: 'educations', responseKey: 'education', title: 'Education Management', singular: 'Education', tableTitle: 'Academic Records', primaryColumn: 'Institution', secondaryColumn: 'Degree', metaColumn: 'Period',
    description: 'Manage academic records, learning history, descriptions, and visual identity.',
    fields: [
      ['institution_name', 'Institution', 'text', true], ['degree', 'Degree', 'text'], ['field_of_study', 'Field of Study', 'text'], ['location', 'Location', 'text'], ['start_date', 'Start Date', 'date'], ['end_date', 'End Date', 'date'], ['sort_order', 'Sort Order', 'number'],
    ],
    booleanFields: [],
    getTitle: (item) => item.institution_name, getSubtitle: (item) => item.field_of_study ?? '-', getSecondary: (item) => item.degree ?? '-', getMeta: (item) => `${item.start_date ?? '-'} - ${item.end_date ?? '-'}`, getLink: (item) => item.logo_url,
    toPayload: (form) => ({ institution_name: form.institution_name, degree: form.degree || null, field_of_study: form.field_of_study || null, location: form.location || null, start_date: form.start_date || null, end_date: form.end_date || null, status: form.status, translations: hydrateTranslations(form.translations), sort_order: Number(form.sort_order) || 0 }),
    toForm: (item) => ({ ...baseForm(), ...item, translations: normalizeTranslations(item.translations) }),
  },
  certification: {
    route: 'certifications', endpoint: 'certifications', responseKey: 'certification', title: 'Certification Management', singular: 'Certification', tableTitle: 'Credentials', primaryColumn: 'Certification', secondaryColumn: 'Issuer', metaColumn: 'Issued',
    description: 'Manage credentials, verification links, badge URLs, expiry, and related skills.',
    fields: [
      ['name', 'Certification Name', 'text', true], ['issuer', 'Issuer', 'text'], ['credential_id', 'Credential ID', 'text'], ['credential_url', 'Credential URL', 'url'], ['issued_at', 'Issued At', 'date'], ['expires_at', 'Expires At', 'date'], ['skillsText', 'Skills', 'text'], ['sort_order', 'Sort Order', 'number'],
    ],
    booleanFields: [],
    getTitle: (item) => item.name, getSubtitle: (item) => item.credential_id ?? '-', getSecondary: (item) => item.issuer ?? '-', getMeta: (item) => item.issued_at ?? '-', getLink: (item) => item.credential_url,
    toPayload: (form) => ({ name: form.name, issuer: form.issuer || null, credential_id: form.credential_id || null, credential_url: form.credential_url || null, issued_at: form.issued_at || null, expires_at: form.expires_at || null, status: form.status, skills: splitCsv(form.skillsText), translations: hydrateTranslations(form.translations), sort_order: Number(form.sort_order) || 0 }),
    toForm: (item) => ({ ...baseForm(), ...item, skillsText: (item.skills ?? []).join(', '), translations: normalizeTranslations(item.translations) }),
  },
};

export function baseForm() {
  return { status: 'draft', sort_order: 0, is_current: false, translations: normalizeTranslations() };
}

export function normalizeTranslations(translations = {}) {
  return {
    id: { description: translations.id?.description ?? '', highlightsText: (translations.id?.highlights ?? []).join('\n') },
    en: { description: translations.en?.description ?? '', highlightsText: (translations.en?.highlights ?? []).join('\n') },
  };
}

export function splitCsv(value = '') {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

export function hydrateTranslations(translations) {
  return {
    id: { description: translations.id.description || null, highlights: splitLines(translations.id.highlightsText) },
    en: { description: translations.en.description || null, highlights: splitLines(translations.en.highlightsText) },
  };
}

function splitLines(value = '') {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}


