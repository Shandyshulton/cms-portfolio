import { createContext, useMemo, useState } from 'react';

export const LanguageContext = createContext(null);

const STORAGE_KEY = 'cms_language';

export const dictionary = {
  en: {
    dashboard: 'Dashboard', projects: 'Projects', experience: 'Experience', education: 'Education', certifications: 'Certifications', contactInbox: 'Inbox', settings: 'Settings',
    managementConsole: 'Management Console', newProject: 'New Project', logout: 'Logout', search: 'Search resources...', superuser: 'Superuser',
    refresh: 'Refresh', status: 'Status', actions: 'Actions', published: 'Published', drafts: 'Drafts', totalProjects: 'Total projects', totalRecords: 'Total records', galleryImages: 'Gallery images', records: 'records', loadingData: 'Loading data...', noProjects: 'No projects yet.', noRecords: 'No records yet.',
    projectManagement: 'Project Management', projectDescription: 'Curate portfolio case studies, production links, bilingual copy, and project galleries.', portfolioEntries: 'Portfolio Entries', project: 'Project', stack: 'Stack', gallery: 'Gallery', live: 'Live', visit: 'Visit',
    language: 'Language', indonesia: 'Indonesia', english: 'English',
  },
  id: {
    dashboard: 'Dasbor', projects: 'Proyek', experience: 'Pengalaman', education: 'Pendidikan', certifications: 'Sertifikasi', contactInbox: 'Inbox', settings: 'Pengaturan',
    managementConsole: 'Panel Manajemen', newProject: 'Proyek Baru', logout: 'Keluar', search: 'Cari data...', superuser: 'Admin Utama',
    refresh: 'Muat Ulang', status: 'Status', actions: 'Aksi', published: 'Terbit', drafts: 'Draft', totalProjects: 'Total proyek', totalRecords: 'Total data', galleryImages: 'Gambar galeri', records: 'data', loadingData: 'Memuat data...', noProjects: 'Belum ada proyek.', noRecords: 'Belum ada data.',
    projectManagement: 'Manajemen Proyek', projectDescription: 'Kelola studi kasus portfolio, link production, teks bilingual, dan galeri project.', portfolioEntries: 'Daftar Portfolio', project: 'Proyek', stack: 'Teknologi', gallery: 'Galeri', live: 'Live', visit: 'Buka',
    language: 'Bahasa', indonesia: 'Indonesia', english: 'English',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'id');

  function setLanguage(nextLanguage) {
    setLanguageState(nextLanguage);
    localStorage.setItem(STORAGE_KEY, nextLanguage);
  }

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => dictionary[language]?.[key] ?? dictionary.en[key] ?? key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
