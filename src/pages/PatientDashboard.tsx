import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../hooks/useAppointments';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, MapPin, Plus, CheckCircle2, XCircle, AlertCircle, Stethoscope, Trash2, Search, ChevronRight, X, RefreshCw, Bell, Settings, User, Filter, MoreHorizontal, ArrowRight, Loader2, Activity } from 'lucide-react';
import { format, isAfter, parseISO, isToday, startOfDay, endOfDay, getDay, addMinutes, isBefore, setHours, setMinutes, startOfToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useState, useEffect, useMemo } from 'react';
import { AppointmentStatus, UserProfile, Specialty, Appointment } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

import { cn } from '../lib/utils';
import ConfirmationModal from '../components/ConfirmationModal';
import ProfileModal from '../components/ProfileModal';
import { useNotifications } from '../hooks/useNotifications';
import { useSchedules } from '../hooks/useSchedules';
import { useDoctorAppointments } from '../hooks/useDoctorAppointments';

import { DashboardStats } from '../components/patient/DashboardStats';
import { QuickActions } from '../components/patient/QuickActions';
import { AppointmentTable } from '../components/patient/AppointmentTable';
import { WaitTimeCard } from '../components/patient/WaitTimeCard';
import { NotificationPanel } from '../components/NotificationPanel';

export default function PatientDashboard() {
  const { profile } = useAuth();
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<UserProfile | null>(null);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  // Temporary greeting effect
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 5000);
    return () => clearTimeout(timer);
  }, []);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleAppointmentId, setRescheduleAppointmentId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());

  const { appointments, loading, createAppointment, updateAppointmentStatus, deleteAppointment, updateAppointment } = useAppointments(profile?.uid, 'patient');

  const rescheduleAppointment = useMemo(() => 
    appointments.find(a => a.id === rescheduleAppointmentId),
    [appointments, rescheduleAppointmentId]
  );

  const activeDoctorId = showNewModal ? selectedDoctor?.uid : rescheduleAppointment?.doctorId;
  const { schedules: doctorSchedules } = useSchedules(activeDoctorId);
  const { appointments: doctorAppointments } = useDoctorAppointments(activeDoctorId, selectedDate);

  const availableSlots = useMemo(() => {
    if (!activeDoctorId || !doctorSchedules.length) return [];

    const dayOfWeek = getDay(selectedDate);
    const schedule = doctorSchedules.find(s => s.dayOfWeek === dayOfWeek);
    if (!schedule) return [];

    const slots: string[] = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    let current = setMinutes(setHours(selectedDate, startH), startM);
    const end = setMinutes(setHours(selectedDate, endH), endM);

    while (isBefore(current, end)) {
      const timeStr = format(current, 'HH:mm');
      
      // Check if slot is already booked
      const isBooked = doctorAppointments.some(apt => {
        const aptTime = format(parseISO(apt.dateTime), 'HH:mm');
        return aptTime === timeStr && apt.status !== 'cancelled' && apt.id !== rescheduleAppointmentId;
      });

      // Check if slot is in the past (if today)
      const isPast = isToday(selectedDate) && isBefore(current, new Date());

      if (!isBooked && !isPast) {
        slots.push(timeStr);
      }
      current = addMinutes(current, schedule.slotDuration || 15);
    }

    return slots;
  }, [activeDoctorId, selectedDate, doctorSchedules, doctorAppointments, rescheduleAppointmentId]);

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

  const upcoming = appointments.filter(a => 
    ['scheduled', 'checked-in', 'in-progress'].includes(a.status) && 
    (isAfter(parseISO(a.dateTime), new Date()) || isToday(parseISO(a.dateTime)))
  );

  const filteredUpcoming = useMemo(() => {
    return upcoming.filter(a => 
      !globalSearch || 
      a.doctorName.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
    );
  }, [upcoming, globalSearch]);

  const pending = appointments.filter(a => a.status === 'scheduled' && isAfter(parseISO(a.dateTime), new Date()));
  const completed = appointments.filter(a => a.status === 'completed');
  const cancelled = appointments.filter(a => ['cancelled', 'no-show'].includes(a.status));

  const history = appointments.filter(a => 
    ['completed', 'cancelled', 'no-show'].includes(a.status) || 
    (!isAfter(parseISO(a.dateTime), new Date()) && !isToday(parseISO(a.dateTime)))
  );

  const filteredHistory = useMemo(() => {
    return history.filter(a => 
      !globalSearch || 
      a.doctorName.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (a.notes && a.notes.toLowerCase().includes(globalSearch.toLowerCase())) ||
      (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
    );
  }, [history, globalSearch]);

  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      const matchesSpecialty = !selectedSpecialty || doc.specialty === selectedSpecialty;
      const matchesSearch = !globalSearch || doc.name.toLowerCase().includes(globalSearch.toLowerCase());
      return matchesSpecialty && matchesSearch;
    });
  }, [doctors, selectedSpecialty, globalSearch]);

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

  const stats = useMemo(() => [
    { label: 'Próximas', value: upcoming.length, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Pendentes', value: pending.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { label: 'Concluídas', value: completed.length, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
    { label: 'Canceladas', value: cancelled.length, icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' },
  ], [upcoming.length, pending.length, completed.length, cancelled.length]);

  if (loading) {
    return (
      <Layout title="Minha Agenda">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        </div>
      </Layout>
    );
  }

  const handleSchedule = async () => {
    if (!selectedDoctor || !selectedTime) return;
    
    const dateTime = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':');
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
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'; // Confirmado
      case 'checked-in': return 'bg-green-500/10 text-green-500 border-green-500/20'; // Presente
      case 'in-progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'; // Em atendimento
      case 'completed': return 'bg-purple-500/10 text-purple-500 border-purple-500/20'; // Concluído
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20'; // Cancelado
      case 'no-show': return 'bg-red-500/10 text-red-500 border-red-500/20'; // Ausente
      default: return 'bg-background/50 text-foreground/70 border-border';
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return 'Confirmado';
      case 'checked-in': return 'Presente';
      case 'in-progress': return 'Em Consulta';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no-show': return 'Ausente';
      default: return status;
    }
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus) => {
    await updateAppointmentStatus(id, status);
  };

  const handleReschedule = async () => {
    if (!rescheduleAppointmentId || !selectedTime) return;
    
    setIsRescheduling(true);
    try {
      const dateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      dateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      await updateAppointment(rescheduleAppointmentId, { 
        dateTime: dateTime.toISOString(),
        status: 'pending'
      });
      setShowRescheduleModal(false);
      setRescheduleAppointmentId(null);
    } catch (error) {
      console.error('Error rescheduling:', error);
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <Layout title="Dashboard do Paciente">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 px-4 md:px-0">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 md:p-8 rounded-[32px] shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 md:w-14 md:h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
              <User className="w-6 h-6 md:w-7 md:h-7" />
            </div>
            <div className="flex-1 min-h-[48px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {showGreeting ? (
                  <motion.h3 
                    key="greeting"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
                    className="text-xl md:text-2xl font-serif font-bold text-foreground"
                  >
                    Olá, {profile?.name?.split(' ')[0] || 'Paciente'}
                  </motion.h3>
                ) : (
                  <motion.h3 
                    key="title"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl md:text-2xl font-serif font-bold text-primary flex items-center gap-2"
                  >
                    <Activity className="w-5 h-5 md:w-6 md:h-6" />
                    SAI Hospitalar - Paciente
                  </motion.h3>
                )}
              </AnimatePresence>
              <p className="text-sm text-foreground/60">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: pt })}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-1 max-w-2xl items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
              <input 
                type="text"
                placeholder="Procurar consultas ou médicos..."
                aria-label="Procurar consultas ou médicos"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-background/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
              />
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <NotificationPanel 
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onDelete={deleteNotification}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(!showNotifications)}
              />
              <button 
                onClick={() => setIsProfileModalOpen(true)}
                className="p-3 md:p-4 bg-background/50 rounded-2xl text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all border border-border"
              >
                <Settings className="w-5 h-5 md:w-6 md:h-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <DashboardStats stats={stats} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6 md:space-y-8">
            <AppointmentTable 
              title="Próximas Consultas"
              appointments={filteredUpcoming}
              onStatusUpdate={updateAppointmentStatus}
              emptyMessage="Nenhuma consulta futura agendada."
            />

            {/* Smart Feature: Wait Time */}
            {upcoming.filter(a => a.status === 'checked-in').map(apt => (
              <WaitTimeCard key={`wait-${apt.id}`} appointment={apt} />
            ))}

            <section className="space-y-4">
              <h4 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-foreground/40" />
                Histórico Recente
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredHistory.slice(0, 4).map((apt) => (
                  <motion.div 
                    key={apt.id} 
                    whileHover={{ y: -2 }}
                    className="bg-card p-5 rounded-[28px] border border-border flex items-center justify-between hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-background rounded-xl flex items-center justify-center text-foreground/40 border border-border">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{apt.doctorName}</p>
                        <p className="text-[10px] text-foreground/60 uppercase tracking-wider">{format(parseISO(apt.dateTime), "dd MMM yyyy", { locale: pt })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border",
                        apt.status === 'completed' ? "bg-purple-500/10 text-purple-500 border-purple-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                      )}>
                        {apt.status === 'completed' ? 'Fim' : 'Canc'}
                      </span>
                      <button 
                        onClick={() => handleDeleteAppointment(apt.id)}
                        className="p-2 text-foreground/30 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar Area */}
          <div className="space-y-6 md:space-y-8">
            <QuickActions 
              onNew={() => setShowNewModal(true)}
              onReschedule={() => {
                const firstScheduled = upcoming.find(a => a.status === 'scheduled');
                if (firstScheduled) {
                  setRescheduleAppointmentId(firstScheduled.id);
                  setShowRescheduleModal(true);
                }
              }}
              onCheckIn={() => {
                const firstScheduled = upcoming.find(a => a.status === 'scheduled');
                if (firstScheduled) updateAppointmentStatus(firstScheduled.id, 'checked-in');
              }}
              onCancel={() => {
                const firstScheduled = upcoming.find(a => a.status === 'scheduled');
                if (firstScheduled) updateAppointmentStatus(firstScheduled.id, 'cancelled');
              }}
            />

            {/* Attendance Score Card */}
            <div className="bg-card p-8 rounded-[40px] border border-border shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 mb-1">Assiduidade</p>
                    <h5 className="text-2xl font-serif font-bold text-foreground">Score de Saúde</h5>
                  </div>
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold">
                    {profile?.attendanceScore || 100}%
                  </div>
                </div>
                <div className="w-full bg-background h-3 rounded-full overflow-hidden border border-border p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${profile?.attendanceScore || 100}%` }}
                    className="bg-linear-to-r from-primary to-primary/60 h-full rounded-full"
                  />
                </div>
                <p className="text-[11px] text-foreground/50 mt-4 leading-relaxed">
                  Mantenha sua pontuação alta para ter <span className="text-primary font-bold">prioridade</span> em novos agendamentos e horários especiais.
                </p>
              </div>
            </div>

            {/* Health Tips / Promo */}
            <div className="bg-linear-to-br from-secondary/10 to-secondary/5 p-8 rounded-[40px] border border-secondary/20">
              <div className="w-12 h-12 bg-secondary/20 rounded-2xl flex items-center justify-center text-secondary mb-4">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h5 className="font-serif font-bold text-lg text-foreground mb-2">Dica de Saúde</h5>
              <p className="text-sm text-foreground/60 leading-relaxed">
                Beber água regularmente e manter uma rotina de exercícios leves ajuda na recuperação e previne doenças crônicas.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New Appointment Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-[32px] p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto relative border border-border"
          >
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowNewModal(false)}
              className="absolute top-6 right-6 p-2 text-foreground/40 hover:text-foreground hover:bg-background rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </motion.button>
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Novo Agendamento</h3>
            
            <div className="space-y-6">
              {/* Specialty Filter */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Filtrar por Especialidade</label>
                <select 
                  value={selectedSpecialty}
                  onChange={(e) => {
                    setSelectedSpecialty(e.target.value);
                    setSelectedDoctor(null);
                  }}
                  className="w-full p-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                >
                  <option value="">Todas as Especialidades</option>
                  {specialties.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Search Doctor */}
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Buscar Médico</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                  <input 
                    type="text"
                    placeholder="Nome do médico..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="w-full pl-11 pr-4 py-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Médicos Disponíveis ({filteredDoctors.length})</label>
                <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                  {filteredDoctors.map(doc => (
                    <button
                      key={doc.uid}
                      onClick={() => setSelectedDoctor(doc)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                        selectedDoctor?.uid === doc.uid 
                          ? "border-primary bg-background ring-2 ring-primary/20" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="w-10 h-10 bg-card rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Stethoscope className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-foreground">{doc.name}</p>
                        <p className="text-xs text-foreground/60">{doc.specialty}</p>
                      </div>
                      {selectedDoctor?.uid === doc.uid && <ChevronRight className="w-4 h-4 text-primary" />}
                    </button>
                  ))}
                  {filteredDoctors.length === 0 && (
                    <p className="text-xs text-foreground/40 italic py-4 text-center">Nenhum médico encontrado com estes filtros.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Data da Consulta</label>
                <input 
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : new Date();
                    setSelectedDate(date);
                  }}
                  className="w-full p-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Horários Disponíveis ({availableSlots.length})</label>
                {selectedDoctor ? (
                  availableSlots.length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map(t => (
                        <button
                          key={t}
                          onClick={() => setSelectedTime(t)}
                          className={cn(
                            "py-2 px-3 rounded-xl border text-xs font-bold transition-all",
                            selectedTime === t 
                              ? "bg-primary text-white border-primary shadow-md" 
                              : "bg-background text-foreground/60 border-border hover:border-primary/50"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-red-500 italic py-2">Sem horários disponíveis para este dia.</p>
                  )
                ) : (
                  <p className="text-xs text-foreground/40 italic py-2">Selecione um médico primeiro.</p>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSchedule}
                  disabled={!selectedDoctor}
                  className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all disabled:opacity-50"
                >
                  Confirmar Agendamento
                </motion.button>
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

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card rounded-[32px] p-8 max-w-md w-full shadow-2xl relative border border-border"
          >
            <button 
              onClick={() => setShowRescheduleModal(false)}
              className="absolute top-6 right-6 p-2 text-foreground/40 hover:text-foreground hover:bg-background rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Reagendar Consulta</h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-sm text-foreground/60 mb-4">
                  Reagendando consulta com <span className="font-bold text-foreground">{rescheduleAppointment?.doctorName}</span>
                </p>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Nova Data</label>
                <input 
                  type="date"
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={format(selectedDate, 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : new Date();
                    setSelectedDate(date);
                  }}
                  className="w-full p-4 rounded-2xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/60 mb-2 block">Horários Disponíveis ({availableSlots.length})</label>
                {availableSlots.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={cn(
                          "py-2 px-3 rounded-xl border text-xs font-bold transition-all",
                          selectedTime === t 
                            ? "bg-primary text-white border-primary shadow-md" 
                            : "bg-background text-foreground/60 border-border hover:border-primary/50"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-red-500 italic py-2">Sem horários disponíveis para este dia.</p>
                )}
              </div>

              <div className="pt-4 space-y-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleReschedule}
                  disabled={isRescheduling}
                  className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isRescheduling ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                  Confirmar Reagendamento
                </motion.button>
                <button 
                  onClick={() => setShowRescheduleModal(false)}
                  className="w-full text-foreground/60 py-2 text-sm font-medium hover:underline"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* Confirmation Modal */}
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
