import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { UserPlus, LogIn, ArrowRight, Mail, Lock, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import { cn } from '../lib/utils';

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});

  const validate = () => {
    const newErrors: { name?: string; email?: string; password?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = 'O nome é obrigatório.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = 'O email é obrigatório.';
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = 'Insira um email válido.';
    }

    if (!password.trim()) {
      newErrors.password = 'A senha é obrigatória.';
    } else if (password.length < 6) {
      newErrors.password = 'A senha deve ter pelo menos 6 caracteres.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const createProfile = async (user: any, displayName: string) => {
    const userDocRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(userDocRef);

    if (!docSnap.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        name: displayName,
        email: user.email || '',
        role: 'patient', // Default role
        createdAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await updateProfile(result.user, { displayName: name });
      await createProfile(result.user, name);
      toast.success('Conta criada com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        toast.error('Este email já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('O formato do email é inválido.');
      } else if (error.code === 'auth/operation-not-allowed') {
        toast.error('O login por email não está ativado no Firebase Console. Por favor, ative-o em Authentication > Sign-in method.');
      } else {
        toast.error('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      // We don't strictly need to call createProfile here because useAuth handles it,
      // but we do it to ensure the name is set correctly if it's a new user.
      await createProfile(result.user, result.user.displayName || 'Usuário');
      
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        setLoading(false);
        return;
      }
      console.error('Registration error:', error);
      if (error.code === 'auth/invalid-credential') {
        toast.error('Credenciais inválidas. Tente novamente.');
      } else {
        toast.error('Erro ao realizar login com Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid grid-cols-1 lg:grid-cols-2">
      {/* Left Side - Visual/Branding */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center border border-border">
              <UserPlus className="text-primary w-6 h-6" />
            </div>
            <span className="text-2xl font-serif font-bold tracking-tight">SAI</span>
          </div>
          
          <h1 className="text-6xl font-serif font-bold leading-tight mb-6">
            Junte-se à Revolução na Saúde.
          </h1>
          <p className="text-xl text-white/80 max-w-md font-serif italic">
            "Eficiência que salva vidas, tecnologia que humaniza o atendimento."
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

      {/* Right Side - Register Form */}
      <div className="flex items-center justify-center p-8 sm:p-12">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md w-full"
        >
          <div className="mb-10">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-2">Criar Conta</h2>
            <p className="text-foreground/60">Preencha os seus dados para começar.</p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: undefined });
                    }}
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-background rounded-2xl border outline-none transition-all text-foreground",
                      errors.name ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-primary/20"
                    )} 
                    placeholder="Seu nome completo" 
                  />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1 ml-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-background rounded-2xl border outline-none transition-all text-foreground",
                      errors.email ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-primary/20"
                    )} 
                    placeholder="seu@email.com" 
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1 ml-1">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/50">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    className={cn(
                      "w-full pl-12 pr-4 py-4 bg-background rounded-2xl border outline-none transition-all text-foreground",
                      errors.password ? "border-red-500 focus:ring-red-500/20" : "border-border focus:ring-primary/20"
                    )} 
                    placeholder="••••••••" 
                  />
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1 ml-1">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processando...' : 'Criar Conta'}
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
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full bg-card text-foreground py-4 rounded-full font-bold border border-border shadow-sm hover:bg-background transition-all flex items-center justify-center gap-3 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn className="w-5 h-5 text-primary" />
              Google
            </button>

            <p className="text-center text-sm text-foreground/60 mt-8">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                Fazer Login
              </Link>
            </p>
          </div>

          <div className="mt-12 text-center">
            <p className="text-[10px] text-foreground/40 uppercase tracking-[0.2em] leading-relaxed">
              Ao criar uma conta, você concorda com nossos<br />
              <span className="underline cursor-pointer">Termos de Serviço</span> e <span className="underline cursor-pointer">Política de Privacidade</span>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
