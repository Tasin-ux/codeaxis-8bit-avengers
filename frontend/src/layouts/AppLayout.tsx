import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Check,
} from 'lucide-react';
import { useAuth } from '../features/auth/AuthContext';
import { cn } from '../lib/cn';

const navGroups = [
  {
    label: 'Workspace',
    items: [
      { name: 'Dashboard', to: '/', icon: LayoutDashboard },
      { name: 'Submissions', to: '/submissions', icon: FileText },
      { name: 'Review Queue', to: '/reviews', icon: ClipboardCheck },
      { name: 'Analytics', to: '/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Knowledge',
    items: [{ name: 'Brand Knowledge', to: '/brand-knowledge', icon: BookOpen }],
  },
  {
    label: 'Admin',
    items: [{ name: 'Workspace Settings', to: '/settings', icon: Settings }],
  },
];

const getInitials = (name?: string) =>
  (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const AppLayout: React.FC = () => {
  const { user, currentWorkspace, workspaces, membership, setCurrentWorkspace, logout } =
    useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
    setWorkspaceMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors',
      isActive
        ? 'bg-white/10 text-white after:absolute after:left-0 after:top-1/2 after:-translate-y-1/2 after:h-4 after:w-[2px] after:rounded-r-full after:bg-teal-400'
        : 'text-stone-400 hover:text-stone-100 hover:bg-white/5'
    );

  return (
    <div className="min-h-screen bg-paper flex">
      {/* Sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col bg-ink text-stone-300 border-r border-white/10">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-white/10">
          <ShieldCheck className="w-5 h-5 text-teal-400" />
          <span className="text-[15px] font-semibold text-white tracking-tight">BrandGuard</span>
        </div>

        {/* Workspace switcher */}
        <div className="px-3 py-3 border-b border-white/10 relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="w-full flex items-center justify-between gap-2 rounded-md bg-white/[0.04] ring-1 ring-inset ring-white/10 px-2.5 py-2 hover:bg-white/[0.07] transition-colors cursor-pointer text-left"
          >
            <div className="min-w-0">
              <div className="text-2xs font-semibold uppercase tracking-[0.14em] text-stone-500 font-mono">
                Workspace
              </div>
              <div className="text-[13px] font-medium text-stone-100 truncate mt-0.5">
                {currentWorkspace?.name || 'Select workspace'}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-stone-500 shrink-0 transition-transform',
                workspaceMenuOpen && 'rotate-180'
              )}
            />
          </button>

          {workspaceMenuOpen && (
            <div className="absolute left-3 right-3 mt-1.5 bg-ink-soft border border-white/10 rounded-md shadow-2xl py-1 z-40 max-h-60 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setWorkspaceMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-[13px] text-stone-300 hover:bg-white/[0.06] hover:text-white flex items-center justify-between gap-2 cursor-pointer"
                >
                  <span className="truncate">{ws.name}</span>
                  {ws.id === currentWorkspace?.id && (
                    <Check className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-2.5 mb-1.5 text-2xs font-semibold uppercase tracking-[0.16em] text-stone-500 font-mono">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink key={item.name} to={item.to} end={item.to === '/'} className={navLinkClass}>
                    <item.icon className="w-4 h-4 shrink-0 opacity-90" />
                    {item.name}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-white/10 relative">
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-1.5 bg-ink-soft border border-white/10 rounded-md shadow-2xl py-1 z-40">
              <div className="px-3 py-2 border-b border-white/10">
                <div className="text-2xs text-stone-500 uppercase tracking-[0.14em] font-mono font-semibold">
                  Signed in as
                </div>
                <div className="text-[13px] font-medium text-stone-100 truncate mt-0.5">
                  {user?.email}
                </div>
              </div>
              <NavLink
                to="/profile"
                className="block px-3 py-2 text-[13px] text-stone-300 hover:bg-white/[0.06] hover:text-white"
              >
                Profile
              </NavLink>
              <NavLink
                to="/settings"
                className="block px-3 py-2 text-[13px] text-stone-300 hover:bg-white/[0.06] hover:text-white"
              >
                Workspace settings
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                Sign out
              </button>
            </div>
          )}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2.5 rounded-md px-2 py-2 hover:bg-white/5 transition-colors cursor-pointer text-left"
          >
            <div className="w-7 h-7 rounded-md bg-teal-500/15 text-teal-300 ring-1 ring-inset ring-teal-500/25 flex items-center justify-center text-[11px] font-semibold shrink-0">
              {getInitials(user?.full_name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-stone-100 truncate">
                {user?.full_name}
              </div>
              <div className="text-2xs text-stone-500 capitalize truncate">
                {membership?.role || 'Member'}
              </div>
            </div>
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-stone-500 shrink-0 transition-transform',
                userMenuOpen && 'rotate-180'
              )}
            />
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="md:hidden bg-ink text-white h-14 flex items-center justify-between px-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <span className="text-[15px] font-semibold tracking-tight">BrandGuard</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
            className="p-1.5 -m-1.5 text-stone-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-ink border-b border-white/10 px-4 py-4 space-y-4 shrink-0">
            <div>
              <div className="text-2xs font-semibold uppercase tracking-[0.16em] text-stone-500 font-mono mb-1">
                Workspace
              </div>
              <div className="text-sm font-medium text-stone-100">
                {currentWorkspace?.name}
              </div>
            </div>
            {navGroups.map((group) => (
              <div key={group.label}>
                <div className="px-1 mb-1 text-2xs font-semibold uppercase tracking-[0.16em] text-stone-500 font-mono">
                  {group.label}
                </div>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <NavLink
                      key={item.name}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium',
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-stone-400 hover:bg-white/5 hover:text-white'
                        )
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      {item.name}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-white/10 space-y-0.5">
              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-stone-400 hover:bg-white/5 hover:text-white"
              >
                Profile
              </NavLink>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-red-400 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
