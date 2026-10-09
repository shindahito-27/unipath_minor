import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, BookOpen, BookOpenCheck, CalendarDays, ChevronDown, Command, DoorOpen, GraduationCap, Layers3, LayoutDashboard, LifeBuoy, LogOut, Search, ClipboardCheck, PartyPopper, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotifications } from '../context/NotificationContext.jsx';

export default function AppLayout() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('unipath_theme') === 'dark');
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const roleNavigation = {
    ADMIN: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
      { to: '/admin/faculty', label: 'Faculty', icon: GraduationCap },
      { to: '/admin/subjects', label: 'Subjects', icon: BookOpenCheck },
      { to: '/admin/sections', label: 'Sections', icon: Layers3 },
      { to: '/admin/timetable', label: 'Timetable', icon: CalendarDays },
      { to: '/admin/quizzes', label: 'Quizzes & venues', icon: ClipboardCheck },
      { to: '/admin/events', label: 'Events', icon: PartyPopper },
    ],
    FACULTY: [{ to: '/faculty', label: 'Faculty workspace', icon: GraduationCap }],
    STUDENT: [{ to: '/student', label: 'Student portal', icon: BookOpen }],
  };
  const navigation = roleNavigation[user?.role] || [];
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('unipath_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);
  const initials = user?.name?.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'UP';
  const pageTitle = {
    '/admin': 'Overview',
    '/admin/rooms': 'Rooms',
    '/admin/faculty': 'Faculty',
    '/admin/subjects': 'Subjects',
    '/admin/sections': 'Sections',
    '/admin/timetable': 'Timetable',
    '/admin/quizzes': 'Quizzes & venues',
    '/admin/events': 'Events',
    '/faculty': 'Faculty workspace',
    '/student': 'Student portal',
  }[location.pathname] || 'Workspace';

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="brand-mark"><Command size={19} strokeWidth={2.4} /></div>
          <span className="brand-name">unipath<span className="brand-period">.</span></span>
          <button className="workspace-switch" aria-label="Switch workspace"><ChevronDown size={15} /></button>
        </div>

        <div className="workspace-card">
          <div className="workspace-avatar">U</div>
          <div className="workspace-copy"><strong>Campus workspace</strong><span>Academic operations</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-section-label">{user?.role === 'ADMIN' ? 'MANAGEMENT' : 'WORKSPACE'}</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-bottom">
          <a className="nav-link subtle-link" href="mailto:support@unipath.example"><LifeBuoy size={17} strokeWidth={1.8} /><span>Help &amp; support</span></a>
          <div className="profile-card">
            <div className="profile-avatar">{initials}</div>
            <div className="profile-copy"><strong>{user?.name}</strong><span>{user?.role}</span></div>
            <button className="icon-button profile-more" onClick={handleLogout} aria-label="Sign out" title="Sign out"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-slash">/</span><strong>{pageTitle}</strong></div>
          <div className="topbar-actions">
            <button className="search-trigger" aria-label="Search"><Search size={16} /><span>Search anything</span><kbd>⌘ K</kbd></button>
            <span className="topbar-divider" />
            <button className="icon-button theme-toggle" onClick={() => setDarkMode((value) => !value)} aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`} title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}>{darkMode ? <Sun size={17}/> : <Moon size={17}/>}</button>
            <button className="icon-button notification-button" aria-label={`${unreadCount} unread notifications`} title={`${unreadCount} unread notifications`} onClick={() => navigate(user?.role === 'STUDENT' ? '/student' : user?.role === 'FACULTY' ? '/faculty' : '/admin')}><Bell size={18} />{unreadCount > 0 && <span className="notification-count-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>}</button>
            <div className="topbar-user">{initials}</div>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </main>
    </div>
  );
}
