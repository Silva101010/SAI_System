import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { motion } from 'motion/react';
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast.error('Email ou senha incorretos. Verifique seus dados ou se você criou a conta via Google.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('O formato do email é inválido.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login por email não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
      } else {
        toast.error('Erro ao realizar login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      console.error('Login error:', error);
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login por Google não está ativado no Firebase Console.');
      } else if (error.code === 'auth/invalid-credential') {
        toast.error('Credenciais inválidas. Tente novamente ou use outro método.');
      } else {
        toast.error('Erro ao realizar login com Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-2 relative">
      {/* Back Arrow */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 z-50 flex items-center gap-2 text-foreground/50 hover:text-primary transition-colors group"
      >
        <div className="w-10 h-10 rounded-full bg-card shadow-sm border border-border flex items-center justify-center group-hover:border-primary/30 group-hover:shadow-md transition-all">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Voltar</span>
      </Link>

      {/* Left Side - Visual/Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
              <ShieldCheck className="text-primary w-6 h-6" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight">SAI</span>
          </div>
          
          <h1 className="text-6xl font-serif font-bold leading-tight mb-6">
            O Futuro da Saúde é Inteligente.
          </h1>
          <p className="text-xl text-white/80 max-w-md font-serif italic">
            "Transformando a experiência hospitalar através da tecnologia e eficiência."
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 text-sm font-medium text-white/60 uppercase tracking-widest">
            <span>Hospital Geral</span>
            <div className="w-1 h-1 bg-white/30 rounded-full" />
            <span>Centro de Saúde</span>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Right Side - Login Form */}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-2">Bem-vindo de volta</h2>
            <p className="text-foreground/60">Acesse sua conta para gerenciar seus agendamentos.</p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-background rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground" 
                    placeholder="seu@email.com" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-background rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground" 
                    placeholder="••••••••" 
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Entrando...' : 'Entrar'}
                {!loading && <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />}
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-foreground/40">Ou continue com</span>
              </div>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-card text-foreground py-4 rounded-full font-bold border border-border shadow-sm hover:bg-background transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5 text-primary" />
              Google
            </button>

            <p className="text-center text-sm text-foreground/60 mt-8">
              Não possui uma conta?{' '}
              <Link to="/register" className="text-primary font-bold hover:underline">
                Criar Conta
              </Link>
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] leading-relaxed">
              Hospital Geral & Centro de Saúde<br />
              <span className="opacity-50">© 2026 SAI - Sistema de Agendamento Inteligente</span>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
