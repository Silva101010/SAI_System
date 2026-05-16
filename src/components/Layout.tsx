import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { LogOut, User, Calendar, Clock, LayoutDashboard, Settings, Home, Sun, Moon, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import ProfileModal from './ProfileModal';
import { useTheme } from '../hooks/useTheme';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  children: ReactNode;
  title: string;
  sidebarActions?: ReactNode;
}

export default function Layout({ children, title, sidebarActions }: LayoutProps) {
  const { profile } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleSync = () => {
      setIsSyncing(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsSyncing(false), 2000);
    };

    window.addEventListener('firestore-sync', handleSync);
    return () => {
      window.removeEventListener('firestore-sync', handleSync);
      clearTimeout(timeout);
    };
  }, []);

  const handleLogout = () => signOut(auth);

  const navItems = [
    { label: 'Início', path: '/', icon: Home },
    { label: 'Dashboard', path: `/${profile?.role}`, icon: LayoutDashboard },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 }
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground transition-colors duration-500">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col transition-colors duration-500">
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border-b border-border"
        >
          <h1 className="text-2xl font-serif font-bold text-foreground">SAI</h1>
          <p className="text-xs text-primary uppercase tracking-widest mt-1">Hospital Geral</p>
        </motion.div>

        <motion.nav 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 p-4 space-y-2"
        >
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Principal</p>
            {navItems.map((item) => (
              <motion.div key={item.path} variants={itemVariants}>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2 rounded-lg transition-all",
                    location.pathname === item.path 
                      ? "bg-primary/10 text-primary border border-primary/20" 
                      : "text-foreground/70 hover:bg-background hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {sidebarActions && (
            <motion.div variants={itemVariants} className="pt-6 mt-6 border-t border-border space-y-1">
              <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Gestão</p>
              {sidebarActions}
            </motion.div>
          )}
        </motion.nav>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="p-4 border-t border-border"
        >
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium text-sm">Sair</span>
          </button>
        </motion.div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 bg-card border-b border-border flex items-center justify-between px-8 transition-colors duration-500">
          <h2 className="text-lg font-serif font-semibold text-foreground">{title}</h2>
          <div className="flex items-center gap-6">
            <AnimatePresence>
              {isSyncing && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full border border-primary/10"
                >
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Sincronizando</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              onClick={toggleTheme}
              className="p-1.5 text-foreground/60 hover:text-primary transition-colors duration-500 rounded-md bg-background/50 border border-border relative overflow-hidden"
              title={theme === 'light' ? 'Mudar para Tokio Dark' : 'Mudar para Light'}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                >
                  {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </motion.div>
              </AnimatePresence>
            </button>
            <div className="flex items-center gap-4 text-xs text-foreground/60">
              <Clock className="w-3.5 h-3.5" />
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-y-auto bg-background">
          {children}
        </div>
      </main>
    </div>
  );
}
