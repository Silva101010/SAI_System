import { useState, FormEvent } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { X, User, Mail, Phone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface NewPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewPatientModal({ isOpen, onClose }: NewPatientModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate a new document reference to get the ID
      const patientRef = doc(collection(db, 'users'));
      
      await setDoc(patientRef, {
        uid: patientRef.id,
        name,
        email,
        contact,
        role: 'patient',
        createdAt: new Date().toISOString(),
        missedAppointments: 0,
        attendanceScore: 100
      });

      toast.success('Paciente registado com sucesso!');
      onClose();
      setName('');
      setEmail('');
      setContact('');
    } catch (error) {
      console.error('Error registering patient:', error);
      toast.error('Erro ao registar paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden border border-border"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-serif font-bold text-foreground">Novo Registo de Paciente</h2>
                <button 
                   onClick={onClose}
                  className="p-2 hover:bg-background rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-foreground/40" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full pl-12 pr-4 py-3 bg-background rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/50 ml-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="exemplo@email.com"
                      className="w-full pl-12 pr-4 py-3 bg-background rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
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
                      className="w-full pl-12 pr-4 py-3 bg-background rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-4 rounded-full font-bold hover:bg-primary-hover transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Registar Paciente'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
