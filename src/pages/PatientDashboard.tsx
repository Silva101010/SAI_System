import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../hooks/useAppointments';
import { motion } from 'motion/react';
import { Calendar, Clock, MapPin, Plus, CheckCircle2, XCircle, AlertCircle, Stethoscope, Trash2, Search, ChevronRight, X } from 'lucide-react';
import { format, isAfter, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';
import { AppointmentStatus, UserProfile, Specialty } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

import { cn } from '../lib/utils';
import ConfirmationModal from '../components/ConfirmationModal';

export default function PatientDashboard() {
  const { profile } = useAuth();
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTime, setSelectedTime] = useState('09:00');

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    isLoading?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const { appointments, loading, createAppointment, updateAppointmentStatus, deleteAppointment } = useAppointments(profile?.uid, 'patient');

  useEffect(() => {
    const fetchDoctors = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'doctor'));
      const snap = await getDocs(q);
      setDoctors(snap.docs.map(d => d.data() as UserProfile));
    };

    const fetchSpecialties = async () => {
      const q = query(collection(db, 'specialties'), orderBy('name'));
      const snap = await getDocs(q);
      setSpecialties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Specialty)));
    };

    fetchDoctors();
    fetchSpecialties();
  }, []);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const matchesSpecialty = !selectedSpecialty || doc.specialty === selectedSpecialty;
      const matchesSearch = !searchTerm || doc.name.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesSpecialty && matchesSearch;
    });
  }, [doctors, selectedSpecialty, searchTerm]);

  const handleSchedule = async () => {
    if (!selectedDoctor || !selectedTime) return;
    
    const dateTime = new Date();
    const timeParts = selectedTime.split(':');
    if (timeParts.length !== 2) return;
    
    const [hours, minutes] = timeParts;
    dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    await createAppointment({
      patientId: profile!.uid,
      patientName: profile!.name,
      doctorId: selectedDoctor.uid,
      doctorName: selectedDoctor.name,
      dateTime: dateTime.toISOString(),
      status: 'scheduled',
    });
    
    setShowNewModal(false);
  };

  const upcoming = appointments.filter(a => 
    ['scheduled', 'checked-in', 'in-progress'].includes(a.status) && 
    isAfter(parseISO(a.dateTime), new Date())
  );

  const history = appointments.filter(a => 
    ['completed', 'cancelled', 'no-show'].includes(a.status) || 
    !isAfter(parseISO(a.dateTime), new Date())
  );

  const handleDeleteAppointment = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar do Histórico',
      message: 'Deseja remover este registo do seu histórico de consultas? Esta ação é apenas visual para o seu painel.',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await deleteAppointment(id);
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (error) {
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-info/10 text-info';
      case 'checked-in': return 'bg-accent/10 text-accent';
      case 'in-progress': return 'bg-secondary/10 text-secondary';
      case 'completed': return 'bg-gray-100 text-gray-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'no-show': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Layout title="Minha Agenda">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-3xl font-serif font-light text-foreground">Olá, {profile?.name ? profile.name.split(' ')[0] : 'Paciente'}</h3>
            <p className="text-primary mt-1">Gerencie suas consultas e acompanhe seu atendimento.</p>
          </div>
          <button 
            onClick={() => setShowNewModal(true)}
            className="bg-primary text-white px-6 py-3 rounded-full flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Próxima Consulta</p>
            {upcoming.length > 0 ? (
              <div>
                <p className="text-2xl font-serif font-bold text-foreground">
                  {format(parseISO(upcoming[0].dateTime), "dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-primary">{upcoming[0].doctorName}</p>
              </div>
            ) : (
              <p className="text-gray-400 italic">Nenhum agendamento</p>
            )}
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Assiduidade</p>
            <p className="text-2xl font-serif font-bold text-foreground">{profile?.attendanceScore || 100}%</p>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
              <div className="bg-primary h-full rounded-full" style={{ width: `${profile?.attendanceScore || 100}%` }}></div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500 uppercase tracking-widest mb-2">Faltas</p>
            <p className="text-2xl font-serif font-bold text-red-600">{profile?.missedAppointments || 0}</p>
          </div>
        </div>

        {/* Upcoming Appointments */}
        <section>
          <h4 className="text-lg font-serif font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Consultas Agendadas
          </h4>
          <div className="grid gap-4">
            {upcoming.length > 0 ? upcoming.map((apt) => (
              <motion.div
                key={apt.id}
                layoutId={apt.id}
                className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-background rounded-2xl flex flex-col items-center justify-center text-primary">
                    <span className="text-xs uppercase font-bold">{format(parseISO(apt.dateTime), 'MMM', { locale: ptBR })}</span>
                    <span className="text-xl font-serif font-bold">{format(parseISO(apt.dateTime), 'dd')}</span>
                  </div>
                  <div>
                    <h5 className="font-serif font-bold text-lg text-foreground">{apt.doctorName}</h5>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(parseISO(apt.dateTime), 'HH:mm')}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Consultório 04</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={cn("px-4 py-1 rounded-full text-xs font-medium uppercase tracking-wider", getStatusColor(apt.status))}>
                    {apt.status}
                  </span>
                  {apt.status === 'scheduled' && (
                    <button 
                      onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
                    >
                      <XCircle className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </motion.div>
            )) : (
              <div className="bg-white p-12 rounded-[24px] border border-dashed border-gray-300 text-center text-gray-400">
                Você não possui consultas agendadas para os próximos dias.
              </div>
            )}
          </div>
        </section>

        {/* History */}
        <section>
          <h4 className="text-lg font-serif font-semibold text-foreground mb-4">Histórico Recente</h4>
          <div className="bg-white rounded-[24px] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-widest">
                  <th className="px-6 py-4 font-medium">Data</th>
                  <th className="px-6 py-4 font-medium">Médico</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Notas</th>
                  <th className="px-6 py-4 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {history.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {format(parseISO(apt.dateTime), "dd/MM/yyyy HH:mm")}
                    </td>
                    <td className="px-6 py-4 font-medium text-foreground">{apt.doctorName}</td>
                    <td className="px-6 py-4">
                      <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", getStatusColor(apt.status))}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 italic">
                      {apt.notes || 'Sem observações'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Eliminar do histórico"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto relative"
          >
            <button 
              onClick={() => setShowNewModal(false)}
              className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Novo Agendamento</h3>
            
            <div className="space-y-6">
              {/* Specialty Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Filtrar por Especialidade</label>
                <select 
                  value={selectedSpecialty}
                  onChange={(e) => {
                    setSelectedSpecialty(e.target.value);
                    setSelectedDoctor(null);
                  }}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Todas as Especialidades</option>
                  {specialties.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Doctor */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Buscar Médico</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Nome do médico..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Médicos Disponíveis ({filteredDoctors.length})</label>
                <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredDoctors.map(doc => (
                    <button
                      key={doc.uid}
                      onClick={() => setSelectedDoctor(doc)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                        selectedDoctor?.uid === doc.uid 
                          ? "border-primary bg-background ring-2 ring-primary/20" 
                          : "border-gray-100 hover:border-gray-300"
                      )}
                    >
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.specialty}</p>
                      </div>
                      {selectedDoctor?.uid === doc.uid && <ChevronRight className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                  {filteredDoctors.length === 0 && (
                    <p className="text-xs text-gray-400 italic py-4 text-center">Nenhum médico encontrado com estes filtros.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Horário (Hoje)</label>
                <select 
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 space-y-3">
                <button 
                  onClick={handleSchedule}
                  disabled={!selectedDoctor}
                  className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all disabled:opacity-50"
                >
                  Confirmar Agendamento
                </button>
                <button 
                  onClick={() => setShowNewModal(false)}
                  className="w-full text-gray-500 py-2 text-sm font-medium hover:underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        isLoading={confirmModal.isLoading}
      />
    </Layout>
  );
}
