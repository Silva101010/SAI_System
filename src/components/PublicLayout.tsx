import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { HeartPulse, ArrowRight, Instagram, Linkedin, Twitter, Mail, Phone, MapPin, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'sonner';

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const { user, profile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Sessão encerrada com sucesso!');
    } catch (error) {
      toast.error('Erro ao encerrar sessão.');
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      {/* Navigation */}
      <nav className="h-20 bg-background/80 backdrop-blur-md border-b border-border fixed w-full z-50 px-8 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
            <HeartPulse className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-serif font-bold text-foreground tracking-tight">SAI</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-foreground/70 uppercase tracking-widest">
          <Link to="/" className="hover:text-primary transition-colors">Início</Link>
          <Link to="/como-funciona" className="hover:text-primary transition-colors">Como Funciona</Link>
          <Link to="/para-pacientes" className="hover:text-primary transition-colors">Pacientes</Link>
          <Link to="/para-medicos" className="hover:text-primary transition-colors">Médicos</Link>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <Link 
                to={`/${profile?.role || 'patient'}`}
                className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-primary-hover transition-all shadow-md flex items-center gap-2"
              >
                Meu Painel <ArrowRight className="w-4 h-4" />
              </Link>
              <button 
                onClick={handleLogout}
                className="text-foreground/50 hover:text-red-500 font-bold text-sm transition-colors flex items-center gap-1 px-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            </div>
          ) : (
            <>
              <Link 
                to="/login"
                className="text-foreground/70 hover:text-primary font-bold text-sm transition-colors px-4"
              >
                Entrar
              </Link>
              <Link 
                to="/register"
                className="bg-primary text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-primary-hover transition-all shadow-md"
              >
                Criar Conta
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {children}
      </main>

      {/* Improved Footer */}
      <footer className="bg-card border-t border-border pt-16 pb-8 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            {/* Brand Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                  <HeartPulse className="text-white w-6 h-6" />
                </div>
                <span className="text-2xl font-serif font-bold text-foreground">SAI</span>
              </div>
              <p className="text-foreground/60 leading-relaxed">
                Revolucionando a gestão hospitalar com inteligência e foco no cuidado humano. Otimizamos processos para que você foque no que importa: a saúde.
              </p>
              <div className="flex gap-4">
                <a href="https://www.instagram.com/as_solutions10?igsh=NzVpOTNmeG96OGcw" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                  <Instagram className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-background flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-all">
                  <Twitter className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Useful Links */}
            <div>
              <h4 className="text-foreground font-serif font-bold text-lg mb-6">Links Úteis</h4>
              <ul className="space-y-4 text-foreground/60">
                <li><Link to="/como-funciona" className="hover:text-primary transition-colors">Como Funciona</Link></li>
                <li><Link to="/para-pacientes" className="hover:text-primary transition-colors">Para Pacientes</Link></li>
                <li><Link to="/para-medicos" className="hover:text-primary transition-colors">Para Médicos</Link></li>
                <li><Link to="/sobre" className="hover:text-primary transition-colors">Sobre o Projeto</Link></li>
                <li><Link to="/contato" className="hover:text-primary transition-colors">Contato</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-foreground font-serif font-bold text-lg mb-6">Suporte</h4>
              <ul className="space-y-4 text-foreground/60">
                <li><Link to="/ajuda" className="hover:text-primary transition-colors">Central de Ajuda</Link></li>
                <li><Link to="/faq" className="hover:text-primary transition-colors">Perguntas Frequentes</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className="text-foreground font-serif font-bold text-lg mb-6">Contato</h4>
              <ul className="space-y-4 text-foreground/60">
                <li className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary shrink-0" />
                  <span>Kuito, Bié Centralidade Horizonte do cuito</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary shrink-0" />
                  <span>927702293</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary shrink-0" />
                  <span>asgrupo69@gmail.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
            <p className="text-sm text-foreground/40">
              © 2026 Sistema de Agendamento Inteligente. Desenvolvido com foco na excelência clínica.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
