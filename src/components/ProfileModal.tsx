import { useState, useEffect, FormEvent, useRef, ChangeEvent } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db, auth, storage } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { X, User, Phone, Mail, Shield, Camera, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { triggerSyncIndicator } from '../lib/utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile } = useAuth();
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Photo states
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password states
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setContact(profile.contact || '');
      setSpecialty(profile.specialty || '');
    }
  }, [profile, isOpen]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Basic validation
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const storageRef = ref(storage, `profiles/${profile.uid}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      await updateDoc(doc(db, 'users', profile.uid), {
        photoURL: downloadURL
      });
      
      toast.success('Foto de perfil atualizada!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error('Erro ao carregar a foto.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    if (newPassword !== confirmPassword) {
      toast.error('As novas palavras-passe não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }

    setChangingPassword(true);
    try {
      // Re-authenticate user first (required for security-sensitive actions)
      const credential = EmailAuthProvider.credential(auth.currentUser.email!, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      
      await updatePassword(auth.currentUser, newPassword);
      
      toast.success('Palavra-passe alterada com sucesso!');
      setShowPasswordSection(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        toast.error('A palavra-passe atual está incorreta.');
      } else {
        toast.error('Erro ao alterar a palavra-passe.');
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    triggerSyncIndicator();
    const promise = updateDoc(doc(db, 'users', profile.uid), {
      name,
      contact,
      specialty: profile.role === 'doctor' ? specialty : profile.specialty
    });

    toast.promise(promise, {
      loading: 'A atualizar perfil...',
      success: 'Perfil atualizado com sucesso!',
      error: 'Erro ao atualizar perfil.'
    });

    try {
      await promise;
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden my-8 border border-border"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-bold text-foreground">Meus Dados</h2>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-background rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-foreground/40" />
                </button>
              </div>

              {/* Photo Section */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full bg-background border-4 border-card shadow-md overflow-hidden flex items-center justify-center">
                    {profile?.photoURL ? (
                      <img 
                        src={profile.photoURL} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-12 h-12 text-foreground/20" />
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-white rounded-full shadow-lg hover:scale-110 transition-transform"
                    disabled={uploadingPhoto}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
                <p className="text-[10px] text-foreground/40 mt-2 uppercase tracking-widest">Clique na câmara para alterar a foto</p>
              </div>

              <div className="space-y-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Contacto</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input
                          type="tel"
                          value={contact}
                          onChange={(e) => setContact(e.target.value)}
                          placeholder="+244 9XX XXX XXX"
                          className="w-full pl-12 pr-4 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                        />
                      </div>
                    </div>
                  </div>

                  {profile?.role === 'doctor' && (
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Especialidade</label>
                      <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                        <input
                          type="text"
                          value={specialty}
                          onChange={(e) => setSpecialty(e.target.value)}
                          placeholder="Ex: Cardiologia"
                          className="w-full pl-12 pr-4 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-background/50 rounded-2xl flex items-center justify-between border border-border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-foreground/40">
                        <Mail className="w-4 h-4 text-primary" />
                        <span>{profile?.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-foreground/40">
                        <Shield className="w-4 h-4 text-primary" />
                        <span className="capitalize">{profile?.role}</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="bg-primary text-white px-6 py-3 rounded-full font-bold hover:bg-primary-hover transition-all shadow-md disabled:opacity-50"
                    >
                      {loading ? 'A guardar...' : 'Guardar'}
                    </button>
                  </div>
                </form>

                {/* Password Section */}
                <div className="pt-6 border-t border-border">
                  <button 
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="flex items-center gap-2 text-sm font-bold text-primary hover:underline mb-4"
                  >
                    <Lock className="w-4 h-4" />
                    {showPasswordSection ? 'Cancelar alteração de senha' : 'Alterar palavra-passe'}
                  </button>

                  <AnimatePresence>
                    {showPasswordSection && (
                      <motion.form
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        onSubmit={handlePasswordChange}
                        className="space-y-4 overflow-hidden"
                      >
                        <div className="space-y-2">
                          <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Senha Atual</label>
                          <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                            <input
                              type={showPasswords ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              className="w-full pl-12 pr-12 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                              required
                            />
                            <button 
                              type="button"
                              onClick={() => setShowPasswords(!showPasswords)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-primary"
                            >
                              {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Nova Senha</label>
                            <input
                              type={showPasswords ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Confirmar Nova Senha</label>
                            <input
                              type={showPasswords ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                              required
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={changingPassword}
                          className="w-full bg-secondary text-white py-3 rounded-full font-bold hover:bg-secondary-hover transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {changingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Atualizar Palavra-passe'}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
