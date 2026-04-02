import { useState, useEffect, FormEvent } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { X, Calendar, Clock, User, Stethoscope, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { UserProfile, Specialty, Appointment } from '../types';
import { format } from 'date-fns';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NewAppointmentModal({ isOpen, onClose }: NewAppointmentModalProps) {
  const [patients, setPatients] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  
  const isoString = new Date().toISOString();
  const today = isoString ? isoString.split('T')[0] : '';
  
  const [patientName, setPatientName] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDate, setSelectedDate] = useState(today);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Fetch doctors
    const unsubDoctors = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'doctor')),
      (snapshot) => {
        setDoctors(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      }
    );

    // Fetch specialties
    const unsubSpecs = onSnapshot(collection(db, 'specialties'), (snapshot) => {
      setSpecialties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Specialty)));
    });

    return () => {
      unsubDoctors();
      unsubSpecs();
    };
  }, [isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !selectedDoctorId) {
      toast.error('Por favor, preencha o nome do paciente e selecione um médico.');
      return;
    }

    setLoading(true);
    try {
      const doctor = doctors.find(d => d.uid === selectedDoctorId);
      if (!doctor) throw new Error('Médico não encontrado.');

      // Logic for "next available slot"
      // 1. Fetch today's appointments for this doctor
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef, 
        where('doctorId', '==', selectedDoctorId),
        where('dateTime', '>=', `${today}T00:00:00Z`),
        where('dateTime', '<=', `${today}T23:59:59Z`)
      );
      
      const snapshot = await getDocs(q);
      const doctorAppointments = snapshot.docs.map(doc => doc.data() as Appointment);

      let nextDateTime: Date;
      const now = new Date();

      if (doctorAppointments.length === 0) {
        // Start from now, rounded up to 5 mins
        nextDateTime = new Date(now);
        nextDateTime.setMinutes(Math.ceil(nextDateTime.getMinutes() / 5) * 5);
        nextDateTime.setSeconds(0);
        nextDateTime.setMilliseconds(0);
      } else {
        // Find the latest appointment
        const sortedApts = doctorAppointments.sort((a, b) => 
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        );
        const lastAptTime = new Date(sortedApts[0].dateTime);
        
        // Add 20 minutes (default slot)
        nextDateTime = new Date(lastAptTime.getTime() + 20 * 60000);
        
        // If the calculated next time is in the past, use current time
        if (nextDateTime < now) {
          nextDateTime = new Date(now);
          nextDateTime.setMinutes(Math.ceil(nextDateTime.getMinutes() / 5) * 5);
          nextDateTime.setSeconds(0);
          nextDateTime.setMilliseconds(0);
        }
      }

      const appointmentRef = doc(collection(db, 'appointments'));

      await setDoc(appointmentRef, {
        id: appointmentRef.id,
        patientId: 'walk-in-' + Date.now(), // Generate a temporary ID for walk-ins
        patientName: patientName.trim(),
        doctorId: selectedDoctorId,
        doctorName: doctor.name,
        dateTime: nextDateTime.toISOString(),
        status: 'checked-in', // Already at the location, skip check-in
        createdAt: new Date().toISOString()
      });

      toast.success(`Agendamento realizado para as ${format(nextDateTime, 'HH:mm')}!`);
      onClose();
      setPatientName('');
      setSelectedDoctorId('');
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao realizar agendamento.');
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
            className="bg-white rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="space-y-1">
                  <h2 className="text-2xl font-serif font-bold text-foreground">Agendamento Imediato</h2>
                  <p className="text-xs text-gray-500">O paciente será adicionado à próxima vaga disponível na fila.</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-2">Nome do Paciente</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Introduzir nome completo"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-2">Médico</label>
                    <div className="relative">
                      <Stethoscope className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <select
                        value={selectedDoctorId}
                        onChange={(e) => setSelectedDoctorId(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none transition-all appearance-none"
                        required
                      >
                        <option value="">Selecionar Médico</option>
                        {doctors.map(d => <option key={d.uid} value={d.uid}>{d.name} ({d.specialty || 'Clínico Geral'})</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-2">Data</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        value={selectedDate}
                        className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-2xl border border-gray-100 outline-none transition-all cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-gray-500 ml-2">Horário</label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <div className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-2xl border border-gray-100 text-sm text-gray-500 italic">
                        Próxima vaga na fila
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-white py-4 rounded-full font-bold hover:bg-primary-hover transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirmar e Iniciar Consulta'}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
