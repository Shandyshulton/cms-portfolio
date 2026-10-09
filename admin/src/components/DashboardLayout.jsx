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
  Menu,
  Moon,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  Trophy,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const activeLanguage = languages.find((item) => item.code === language) ?? languages[0];

  function chooseLanguage(nextLanguage) {
    setLanguage(nextLanguage);
    setLanguageOpen(false);
  }

  function closeNav() {
    setNavOpen(false);
  }

  // Drawer: Escape closes it, and page scroll is locked while it is open (mobile/tablet only, see CSS).
  useEffect(() => {
    if (!navOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.body.classList.add('nav-locked');
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.classList.remove('nav-locked');
    };
  }, [navOpen]);

  // Language menu: close on outside click / Escape.
  useEffect(() => {
    if (!languageOpen) return undefined;
    const onPointerDown = (event) => {
      if (!event.target.closest('.language-switcher')) setLanguageOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setLanguageOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [languageOpen]);

  const userName = auth.user?.name ?? 'Admin';

  return (
    <div className="cms-shell">
      <div className={`sidebar-backdrop ${navOpen ? 'is-open' : ''}`} onClick={closeNav} aria-hidden="true" />

      <aside id="app-sidebar" className={`sidebar ${navOpen ? 'is-open' : ''}`}>
        <div className="sidebar-brand">
          <div>
            <strong>Portfolio CMS</strong>
            <span>{t('managementConsole')}</span>
          </div>
          <button className="icon-button sidebar-close" type="button" aria-label="Close navigation" onClick={closeNav}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.to} to={item.to} end={item.end} onClick={closeNav} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                <Icon size={20} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="avatar"><ShieldCheck size={20} /></div>
            <div>
              <strong>{userName}</strong>
              <span>{t('superuser')}</span>
            </div>
          </div>
          <NavLink className="sidebar-cta" to="/projects/new" onClick={closeNav}>
            <Plus size={18} />
            {t('newProject')}
          </NavLink>
          <button className="logout-button" type="button" onClick={auth.logout}>
            <LogOut size={18} />
            {t('logout')}
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className={`topbar ${searchOpen ? 'search-open' : ''}`}>
          <button className="icon-button menu-button" type="button" aria-label="Open navigation" aria-controls="app-sidebar" aria-expanded={navOpen} onClick={() => setNavOpen(true)}>
            <Menu size={22} />
          </button>
          <NavLink className="topbar-brand" to="/">Portfolio CMS</NavLink>

          <label className="global-search">
            <Search size={18} />
            <input placeholder={t('search')} />
          </label>

          <div className="topbar-actions">
            <button className="icon-button search-toggle" type="button" aria-label={t('search')} aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}>
              {searchOpen ? <X size={20} /> : <Search size={20} />}
            </button>
            <button className="icon-button" type="button" aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} onClick={toggleTheme}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <div className="language-switcher">
              <button className="icon-button language-button" type="button" aria-label={t('language')} aria-expanded={languageOpen} onClick={() => setLanguageOpen((open) => !open)}>
                <Globe2 size={20} />
                <span>{activeLanguage.shortLabel}</span>
                <ChevronDown size={14} />
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
            <button className="icon-button notification" type="button" aria-label="Notifications"><Bell size={20} /></button>
            <div className="admin-mini">
              <div>
                <strong>{userName}</strong>
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
