import { ReactNode, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, Calendar, Clock, LayoutDashboard, Settings, Home } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import ProfileModal from './ProfileModal';

interface LayoutProps {
  children: ReactNode;
  title: string;
  sidebarActions?: ReactNode;
}

export default function Layout({ children, title, sidebarActions }: LayoutProps) {
  const { profile } = useAuth();
  const location = useLocation();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => signOut(auth);

  const navItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Dashboard', path: `/${profile?.role}`, icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-serif font-bold text-foreground">SAI</h1>
          <p className="text-xs text-primary uppercase tracking-widest mt-1">Hospital Geral</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Principal</p>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                  location.pathname === item.path 
                    ? "bg-primary text-white shadow-md" 
                    : "text-gray-600 hover:bg-gray-50"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {sidebarActions && (
            <div className="pt-6 mt-6 border-t border-gray-100 space-y-1">
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Gestão</p>
              {sidebarActions}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 mb-4 hover:bg-gray-50 rounded-2xl transition-all group text-left"
          >
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary/10 transition-colors overflow-hidden">
              {profile?.photoURL ? (
                <img 
                  src={profile.photoURL} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{profile?.name}</p>
              <p className="text-xs text-gray-500 uppercase tracking-tighter">{profile?.role}</p>
            </div>
            <Settings className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-serif font-semibold text-foreground">{title}</h2>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </header>
        <div className="flex-1 p-8 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
