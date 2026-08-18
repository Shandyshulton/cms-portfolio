import {
  Bell,
  Briefcase,
  Check,
  ChevronDown,
  Folder,
  Globe2,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Mail,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/useAuth.js';
import { useLanguage } from '../lib/useLanguage.js';
import { useTheme } from '../lib/useTheme.js';

const navItems = [
  { to: '/', labelKey: 'dashboard', icon: LayoutGrid, end: true },
  { to: '/projects', labelKey: 'projects', icon: Folder },
  { to: '/experience', labelKey: 'experience', icon: Briefcase },
  { to: '/education', labelKey: 'education', icon: GraduationCap },
  { to: '/certifications', labelKey: 'certifications', icon: Trophy },
  { to: '/contact-submissions', labelKey: 'contactInbox', icon: Mail },
  { to: '/settings', labelKey: 'settings', icon: Settings },
];

const languages = [
  { code: 'id', labelKey: 'indonesia', shortLabel: 'ID' },
  { code: 'en', labelKey: 'english', shortLabel: 'EN' },
];

export default function DashboardLayout() {
  const auth = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [languageOpen, setLanguageOpen] = useState(false);
  const activeLanguage = languages.find((item) => item.code === language) ?? languages[0];

  function chooseLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setLanguageOpen(false);
  }

  return (
    <div className="cms-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>Portfolio CMS</strong>
          <span>{t('managementConsole')}</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                <Icon size={24} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <NavLink className="sidebar-cta" to="/projects/new">
            <Plus size={24} />
            {t('newProject')}
          </NavLink>
          <button className="logout-button" type="button" onClick={auth.logout}>
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <label className="global-search">
            <Search size={24} />
            <input placeholder={t('search')} />
          </label>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="language-switcher">
              <button className="icon-button language-button" type="button" aria-label={t('language')} aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)}>
                <Globe2 size={22} />
                <span>{activeLanguage.shortLabel}</span>
                <ChevronDown size={15} />
              </button>
              {languageOpen && (
                <div className="language-menu">
                  {languages.map((item) => (
                    <button key={item.code} type="button" onClick={() => chooseLanguage(item.code)}>
                      <span>{item.shortLabel}</span>
                      <strong>{t(item.labelKey)}</strong>
                      {language === item.code && <Check size={16} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="icon-button notification" type="button" aria-label="Notifications"><Bell size={22} /></button>
            <div className="admin-mini">
              <div>
                <strong>{auth.user?.name ?? 'Admin'}</strong>
                <span>{t('superuser')}</span>
              </div>
              <div className="avatar"><ShieldCheck size={20} /></div>
            </div>
          </div>
        </header>
        <Outlet />
      </div>
    </div>
  );
}
