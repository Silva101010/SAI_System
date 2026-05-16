import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../hooks/useAppointments';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, CheckCircle2, Play, User, AlertCircle, RefreshCw, Calendar, Settings, Save, Plus, Trash2, Stethoscope, Bell, MoreHorizontal, History, FileText, Lock, ArrowRight, Timer, Search, X } from 'lucide-react';
import { format, parseISO, isToday, isAfter, differenceInSeconds } from 'date-fns';
import { pt } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Appointment, Specialty, DoctorSchedule, AppointmentStatus } from '../types';
import { useState, useEffect, useMemo, useRef } from 'react';
import ProfileModal from '../components/ProfileModal';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPanel } from '../components/NotificationPanel';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { appointments, loading, updateAppointmentStatus, syncPublicQueue } = useAppointments(profile?.uid, 'doctor');
  const [activeTab, setActiveTab] = useState<'queue' | 'agenda' | 'specialty' | 'schedule' | 'info'>('queue');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [consultationTimer, setConsultationTimer] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const { notifications, unreadCount, markAsRead, markAllAsRead, createNotification, deleteNotification } = useNotifications();

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Temporary greeting effect
  useEffect(() => {
    const timer = setTimeout(() => setShowGreeting(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-sync public queue for today's appointments
  useEffect(() => {
    if (appointments.length > 0) {
      const today = appointments.filter(a => isToday(parseISO(a.dateTime)));
      today.forEach(apt => {
        syncPublicQueue(apt.id, apt);
      });
    }
  }, [appointments, syncPublicQueue]);

  // No-show detection
  useEffect(() => {
    if (!profile?.uid) return;
    const checkNoShows = () => {
      const now = new Date();
      const noShows = appointments.filter(a => {
        if (!isToday(parseISO(a.dateTime)) || a.status !== 'scheduled') return false;
        const aptTime = parseISO(a.dateTime);
        const diffMinutes = (now.getTime() - aptTime.getTime()) / (1000 * 60);
        return diffMinutes > 15; // 15 minutes late
      });

      noShows.forEach(apt => {
        const notificationId = `noshow-${apt.id}`;
        if (!notifications.find(n => n.id === notificationId)) {
          createNotification({
            userId: profile.uid,
            title: 'Paciente Ausente',
            message: `${apt.patientName} (${format(parseISO(apt.dateTime), 'HH:mm')}) não compareceu.`,
            type: 'alert'
          }, notificationId);
        }
      });
    };

    const interval = setInterval(checkNoShows, 60000); // Check every minute
    checkNoShows();
    return () => clearInterval(interval);
  }, [appointments, notifications, profile, createNotification]);

  const [selectedPatientDetails, setSelectedPatientDetails] = useState<Appointment | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Specialty State
  const [availableSpecialties, setAvailableSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState(profile?.specialty || '');
  const [isSavingSpecialty, setIsSavingSpecialty] = useState(false);

  // Doctor Info State
  const [doctorInfo, setDoctorInfo] = useState({
    name: profile?.name || '',
    crm: profile?.crm || '',
    bio: profile?.bio || '',
    contact: profile?.contact || ''
  });
  const [isSavingInfo, setIsSavingInfo] = useState(false);

  // Schedule State
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '17:00',
    slotDuration: 20
  });

  const emptySlotsCount = useMemo(() => {
    const today = new Date().getDay();
    const todaySchedule = schedules.filter(s => s.dayOfWeek === today);
    if (todaySchedule.length === 0) return 0;
    
    let totalPossibleSlots = 0;
    todaySchedule.forEach(s => {
      const start = parseISO(`2000-01-01T${s.startTime}`);
      const end = parseISO(`2000-01-01T${s.endTime}`);
      const durationInMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
      totalPossibleSlots += Math.floor(durationInMinutes / s.slotDuration);
    });
    
    const bookedToday = appointments.filter(a => isToday(parseISO(a.dateTime))).length;
    return Math.max(0, totalPossibleSlots - bookedToday);
  }, [schedules, appointments]);

  const filteredAgenda = useMemo(() => {
    return appointments
      .filter(a => isToday(parseISO(a.dateTime)))
      .filter(a => 
        a.patientName.toLowerCase().includes(globalSearch.toLowerCase()) ||
        (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
      )
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }, [appointments, globalSearch]);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Consultation timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const inProgress = appointments.find(a => isToday(parseISO(a.dateTime)) && a.status === 'in-progress');
    
    if (inProgress && inProgress.checkInTime) {
      interval = setInterval(() => {
        const seconds = differenceInSeconds(new Date(), parseISO(inProgress.checkInTime!));
        setConsultationTimer(seconds);
      }, 1000);
    } else {
      setConsultationTimer(0);
    }
    
    return () => clearInterval(interval);
  }, [appointments]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (activeTab === 'specialty') {
      const fetchSpecialties = async () => {
        const q = query(collection(db, 'specialties'), orderBy('name'));
        const snap = await getDocs(q);
        setAvailableSpecialties(snap.docs.map(d => ({ id: d.id, ...d.data() } as Specialty)));
      };
      fetchSpecialties();
    }
    
    if (activeTab === 'schedule' && profile?.uid) {
      const fetchSchedules = async () => {
        const q = query(collection(db, 'schedules'), where('doctorId', '==', profile.uid));
        const snap = await getDocs(q);
        setSchedules(snap.docs.map(d => ({ id: d.id, ...d.data() } as DoctorSchedule)));
      };
      fetchSchedules();
    }
  }, [activeTab, profile?.uid]);

  const handleUpdateSpecialty = async () => {
    if (!profile?.uid) return;
    setIsSavingSpecialty(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        specialty: selectedSpecialty
      });
    } catch (error) {
      console.error("Error updating specialty:", error);
    } finally {
      setIsSavingSpecialty(false);
    }
  };

  const handleUpdateInfo = async () => {
    if (!profile?.uid) return;
    setIsSavingInfo(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        ...doctorInfo
      });
    } catch (error) {
      console.error("Error updating doctor info:", error);
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleAddSchedule = async () => {
    if (!profile?.uid) return;
    setIsSavingSchedule(true);
    try {
      const docRef = await addDoc(collection(db, 'schedules'), {
        ...newSchedule,
        doctorId: profile.uid
      });
      setSchedules([...schedules, { id: docRef.id, ...newSchedule, doctorId: profile.uid }]);
    } catch (error) {
      console.error("Error adding schedule:", error);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'schedules', id));
      setSchedules(schedules.filter(s => s.id !== id));
    } catch (error) {
      console.error("Error deleting schedule:", error);
    }
  };

  const daysOfWeek = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda-feira' },
    { value: 2, label: 'Terça-feira' },
    { value: 3, label: 'Quarta-feira' },
    { value: 4, label: 'Quinta-feira' },
    { value: 5, label: 'Sexta-feira' },
    { value: 6, label: 'Sábado' },
  ];

  // Active queue: patients who have checked in but not finished
  const activeQueue = appointments
    .filter(a => isToday(parseISO(a.dateTime)) && ['checked-in', 'in-progress'].includes(a.status))
    .filter(a => !globalSearch || 
      a.patientName.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
    )
    .sort((a, b) => {
      // Sort by status (in-progress first), then by scheduled time
      if (a.status === 'in-progress') return -1;
      if (b.status === 'in-progress') return 1;
      return parseISO(a.dateTime).getTime() - parseISO(b.dateTime).getTime();
    });

  // Scheduled for today but not checked in yet
  const pending = appointments.filter(a => 
    isToday(parseISO(a.dateTime)) && a.status === 'scheduled' &&
    (!globalSearch || 
      a.patientName.toLowerCase().includes(globalSearch.toLowerCase()) ||
      (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
    )
  );

  const currentPatient = activeQueue.find(a => a.status === 'in-progress');
  const nextInLine = activeQueue.filter(a => a.status === 'checked-in');

  const handleStartConsultation = (id: string) => {
    // If there's already one in progress, we should finish it first or warn
    if (currentPatient) {
      updateAppointmentStatus(currentPatient.id, 'completed');
    }
    updateAppointmentStatus(id, 'in-progress');
  };

  const handleFinishConsultation = (id: string) => {
    updateAppointmentStatus(id, 'completed');
  };

  const sidebarActions = (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Atendimento</p>
        <motion.button 
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('queue')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
            activeTab === 'queue' ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground/70 hover:bg-background hover:text-foreground"
          )}
        >
          <Users className="w-4 h-4" />
          Fila de Espera
        </motion.button>
        <motion.button 
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('agenda')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
            activeTab === 'agenda' ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground/70 hover:bg-background hover:text-foreground"
          )}
        >
          <Calendar className="w-4 h-4" />
          Agenda Completa
        </motion.button>
      </div>

      <div className="space-y-1">
        <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Configurações</p>
        <motion.button 
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('info')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
            activeTab === 'info' ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground/70 hover:bg-background hover:text-foreground"
          )}
        >
          <User className="w-4 h-4" />
          Perfil Profissional
        </motion.button>
        <motion.button 
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('specialty')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
            activeTab === 'specialty' ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground/70 hover:bg-background hover:text-foreground"
          )}
        >
          <Stethoscope className="w-4 h-4" />
          Especialidade
        </motion.button>
        <motion.button 
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab('schedule')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
            activeTab === 'schedule' ? "bg-primary/10 text-primary border border-primary/20" : "text-foreground/70 hover:bg-background hover:text-foreground"
          )}
        >
          <Clock className="w-4 h-4" />
          Horários
        </motion.button>
      </div>
    </div>
  );
  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return 'Agendado';
      case 'checked-in': return 'Presente';
      case 'in-progress': return 'Em Consulta';
      case 'completed': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      case 'no-show': return 'Ausente';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'checked-in': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'no-show': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'in-progress': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'completed': return 'bg-background/50 text-foreground border-border';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <Layout title="Painel Médico" sidebarActions={sidebarActions}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Custom Header with Clock and Notifications */}
        {/* Patient Details Modal */}
        <AnimatePresence>
          {selectedPatientDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden border border-border"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center border border-border">
                      <User className="w-8 h-8 text-foreground/40" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-foreground">{selectedPatientDetails.patientName}</h3>
                      <p className="text-sm text-foreground/60">ID: {selectedPatientDetails.patientId}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedPatientDetails(null)}
                    className="p-2 hover:bg-background rounded-full transition-colors"
                  >
                    <Plus className="w-6 h-6 rotate-45 text-foreground/40" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-background/50 rounded-2xl border border-border">
                    <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1">Data</p>
                    <p className="font-medium text-foreground">{format(parseISO(selectedPatientDetails.dateTime), 'dd/MM/yyyy')}</p>
                  </div>
                  <div className="p-4 bg-background/50 rounded-2xl border border-border">
                    <p className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest mb-1">Horário</p>
                    <p className="font-medium text-foreground">{format(parseISO(selectedPatientDetails.dateTime), 'HH:mm')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-foreground">Histórico Recente</h4>
                  <div className="space-y-2">
                    <div className="p-3 border border-border rounded-xl flex items-center justify-between bg-background/50">
                      <span className="text-sm text-foreground/40">Última consulta</span>
                      <span className="text-xs font-medium text-foreground/60">15/03/2026</span>
                    </div>
                    <div className="p-3 border border-border rounded-xl flex items-center justify-between bg-background/50">
                      <span className="text-sm text-foreground/40">Status Geral</span>
                      <span className="text-xs font-medium text-green-500">Estável</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedPatientDetails(null)}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-lg shadow-primary/20"
                >
                  Fechar Detalhes
                </button>
              </div>
            </motion.div>
          </div>
          )}
        </AnimatePresence>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-[32px] shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <User className="w-6 h-6" />
            </div>
            <div className="flex-1 min-h-[48px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {showGreeting ? (
                  <motion.h3 
                    key="greeting"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
                    className="text-xl font-serif font-bold text-foreground"
                  >
                    Olá, Dr. {profile?.name?.split(' ')[0]}
                  </motion.h3>
                ) : (
                  <motion.h3 
                    key="title"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-serif font-bold text-primary flex items-center gap-2"
                  >
                    <Stethoscope className="w-5 h-5" />
                    SAI Hospitalar - Ambulatório
                  </motion.h3>
                )}
              </AnimatePresence>
              <p className="text-sm text-foreground/60 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {format(currentTime, "EEEE, d 'de' MMMM 'de' yyyy '•' HH:mm:ss", { locale: pt })}
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row flex-1 max-w-2xl items-center gap-4">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 group-focus-within:text-primary transition-colors" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Procurar paciente ou consulta..."
                aria-label="Procurar paciente ou consulta"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-11 pr-16 py-3 bg-background/50 border border-border rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground shadow-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {globalSearch && (
                  <button 
                    onClick={() => setGlobalSearch('')}
                    className="p-1.5 text-foreground/40 hover:text-foreground hover:bg-background rounded-full transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-foreground/40 opacity-100 group-focus-within:hidden">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
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
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 bg-background/50 rounded-2xl text-foreground/40 hover:bg-primary/10 hover:text-primary transition-all border border-border"
              >
                <History className="w-5 h-5" />
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsProfileModalOpen(true)}
                className="p-3 bg-background/50 rounded-2xl text-foreground/40 hover:bg-primary/10 hover:text-primary transition-all border border-border"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>

        {activeTab === 'queue' && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Agendados', value: appointments.filter(a => isToday(parseISO(a.dateTime))).length, icon: Calendar, color: 'bg-blue-500/10 text-blue-500' },
                { label: 'Presentes', value: appointments.filter(a => isToday(parseISO(a.dateTime)) && ['checked-in', 'in-progress'].includes(a.status)).length, icon: CheckCircle2, color: 'bg-green-500/10 text-green-500' },
                { label: 'Em Espera', value: appointments.filter(a => isToday(parseISO(a.dateTime)) && a.status === 'checked-in').length, icon: Clock, color: 'bg-amber-500/10 text-amber-500' },
                { label: 'Ausentes', value: appointments.filter(a => isToday(parseISO(a.dateTime)) && a.status === 'no-show').length, icon: AlertCircle, color: 'bg-red-500/10 text-red-500' },
                { label: 'Em Consulta', value: appointments.filter(a => isToday(parseISO(a.dateTime)) && a.status === 'in-progress').length, icon: Play, color: 'bg-purple-500/10 text-purple-500' },
                { label: 'Vagas', value: emptySlotsCount, icon: Plus, color: 'bg-foreground/10 text-foreground/60' },
              ].map((card, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card p-5 rounded-[16px] border border-border shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={cn("p-1.5 rounded-md", card.color)}>
                      <card.icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">{card.label}</span>
                  </div>
                  <p className="text-2xl font-serif font-bold text-foreground">{card.value}</p>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
              {/* Active Queue Table */}
              <div className="xl:col-span-3 space-y-6">
                <div className="bg-card rounded-[32px] border border-border shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-serif font-bold text-foreground">Fila de Pacientes Ativos</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-foreground/60">Próximo atendimento estimado em 15 min</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-background/50">
                          <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Ordem</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Paciente</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Horário</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Check-in</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {activeQueue.map((apt, index) => (
                          <tr key={apt.id} className={cn(
                            "group transition-all",
                            apt.status === 'in-progress' ? "bg-primary/5" : "hover:bg-background/50"
                          )}>
                            <td className="px-6 py-5">
                              <span className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-xs font-bold text-foreground/60 border border-border">
                                {index + 1}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center border border-border">
                                  <User className="w-5 h-5 text-foreground/40" />
                                </div>
                                <div>
                                  <p className="font-bold text-foreground">{apt.patientName}</p>
                                  <p className="text-[10px] text-foreground/40 uppercase tracking-tighter">Prioridade Normal</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-foreground/70 font-medium">
                              {format(parseISO(apt.dateTime), 'HH:mm')}
                            </td>
                            <td className="px-6 py-5 text-sm text-foreground/60">
                              {apt.checkInTime ? format(parseISO(apt.checkInTime), 'HH:mm') : '--:--'}
                            </td>
                            <td className="px-6 py-5">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                getStatusColor(apt.status)
                              )}>
                                {getStatusLabel(apt.status)}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              {apt.status === 'pending' ? (
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => updateAppointmentStatus(apt.id, 'scheduled')}
                                  className="bg-green-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Confirmar
                                </motion.button>
                              ) : apt.status === 'in-progress' ? (
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleFinishConsultation(apt.id)}
                                  className="bg-foreground text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Finalizar
                                </motion.button>
                              ) : (
                                <motion.button 
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => handleStartConsultation(apt.id)}
                                  className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                                >
                                  <Play className="w-4 h-4 fill-current" />
                                  Iniciar
                                </motion.button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {activeQueue.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-foreground/40 italic">
                              Nenhum paciente aguardando na fila ativa.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Quick Actions & Details */}
              <div className="space-y-6">
                {currentPatient ? (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-primary text-white p-6 rounded-[32px] shadow-xl relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                          <Timer className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-white/60 tracking-widest">Tempo em Consulta</p>
                          <p className="text-2xl font-serif font-bold">{formatTimer(consultationTimer)}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4 mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold">{currentPatient.patientName}</p>
                            <p className="text-xs text-white/60">Agendado: {format(parseISO(currentPatient.dateTime), 'HH:mm')}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => setSelectedPatientDetails(currentPatient)}
                          className="w-full bg-white/10 hover:bg-white/20 text-white py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 border border-white/10"
                        >
                          <FileText className="w-4 h-4" />
                          Ver Prontuário
                        </button>
                        <button 
                          onClick={() => handleFinishConsultation(currentPatient.id)}
                          className="w-full bg-white text-primary py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          Finalizar Consulta
                        </button>
                      </div>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
                  </motion.div>
                ) : (
                  <div className="bg-card p-8 rounded-[32px] border border-dashed border-border text-center space-y-4">
                    <Users className="w-12 h-12 text-foreground/20 mx-auto" />
                    <p className="text-foreground/40 font-serif italic">Pronto para o próximo atendimento?</p>
                    {nextInLine.length > 0 && (
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleStartConsultation(nextInLine[0].id)}
                        className="w-full bg-primary text-white py-3 rounded-2xl font-bold shadow-lg"
                      >
                        Chamar {nextInLine[0].patientName.split(' ')[0]}
                      </motion.button>
                    )}
                  </div>
                )}

                <div className="bg-card p-6 rounded-[32px] border border-border shadow-sm space-y-4">
                  <h4 className="text-[10px] uppercase font-bold text-foreground/40 tracking-widest">Ações Rápidas</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <button className="flex items-center justify-between p-4 bg-background/50 rounded-2xl hover:bg-primary/5 group transition-all border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-card rounded-xl flex items-center justify-center text-foreground/40 group-hover:text-primary transition-colors border border-border">
                          <Plus className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground/70 group-hover:text-foreground transition-colors">Adiantar Paciente</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-all" />
                    </button>
                    <button className="flex items-center justify-between p-4 bg-background/50 rounded-2xl hover:bg-red-500/10 group transition-all border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-card rounded-xl flex items-center justify-center text-foreground/40 group-hover:text-red-500 transition-colors border border-border">
                          <Lock className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-bold text-foreground/70 group-hover:text-red-700 transition-colors">Bloquear Slot</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-foreground/30 group-hover:text-red-500 transition-all" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'agenda' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-foreground">Agenda do Dia</h3>
                  <p className="text-foreground/60">Visualize todos os compromissos marcados para hoje.</p>
                </div>
              </div>

              <div className="space-y-4">
                {filteredAgenda.map((apt) => (
                  <div 
                    key={apt.id}
                    className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-[24px] border border-border hover:border-primary/20 hover:bg-primary/5 transition-all gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-card rounded-2xl shadow-sm flex items-center justify-center font-bold text-primary border border-border">
                        {format(parseISO(apt.dateTime), 'HH:mm')}
                      </div>
                      <div>
                        <h4 className="font-serif font-bold text-foreground text-lg">{apt.patientName}</h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border",
                            getStatusColor(apt.status)
                          )}>
                            {getStatusLabel(apt.status)}
                          </span>
                          {apt.checkInTime && (
                            <span className="text-[10px] text-foreground/40 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Check-in às {format(parseISO(apt.checkInTime), 'HH:mm')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <button 
                        onClick={() => setSelectedPatientDetails(apt)}
                        className="flex-1 md:flex-none px-4 py-2 bg-background/50 text-foreground/70 border border-border rounded-xl text-xs font-bold hover:bg-background transition-all"
                      >
                        Detalhes
                      </button>
                      {apt.status === 'checked-in' && (
                        <motion.button 
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            handleStartConsultation(apt.id);
                            setActiveTab('queue');
                          }}
                          className="flex-1 md:flex-none bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold shadow-md hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          Atender Agora
                        </motion.button>
                      )}
                    </div>
                  </div>
                ))}
                {filteredAgenda.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <div className="w-16 h-16 bg-background/50 rounded-full flex items-center justify-center mx-auto mb-4 text-foreground/20">
                      <Search className="w-8 h-8" />
                    </div>
                    <h4 className="text-lg font-serif font-bold text-foreground mb-1">Sem resultados</h4>
                    <p className="text-sm text-foreground/40 mb-4">Nenhum agendamento encontrado para "{globalSearch}"</p>
                    <button 
                      onClick={() => setGlobalSearch('')}
                      className="text-primary text-sm font-medium hover:underline"
                    >
                      Limpar busca
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'info' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-[32px] shadow-sm border border-border max-w-3xl"
          >
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Informações Profissionais</h3>
            <p className="text-foreground/60 mb-8">Gerencie seus dados públicos que serão exibidos para os pacientes.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Nome Completo</label>
                <input 
                  type="text"
                  value={doctorInfo.name}
                  onChange={(e) => setDoctorInfo({...doctorInfo, name: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Nº de Ordem (ORMED)</label>
                <input 
                  type="text"
                  value={doctorInfo.crm}
                  onChange={(e) => setDoctorInfo({...doctorInfo, crm: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Ex: ORMED-12345"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Contato / Telefone</label>
                <input 
                  type="text"
                  value={doctorInfo.contact}
                  onChange={(e) => setDoctorInfo({...doctorInfo, contact: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Ex: 923 000 000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Biografia / Sobre</label>
                <textarea 
                  value={doctorInfo.bio}
                  onChange={(e) => setDoctorInfo({...doctorInfo, bio: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px]"
                  placeholder="Conte um pouco sobre sua experiência e formação..."
                />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdateInfo}
              disabled={isSavingInfo}
              className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingInfo ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar Informações
            </motion.button>
          </motion.div>
        )}

        {activeTab === 'specialty' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card p-8 rounded-[32px] shadow-sm border border-border max-w-2xl"
          >
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Configurar Especialidade</h3>
            <p className="text-foreground/60 mb-8">Selecione sua especialidade principal para que os pacientes possam encontrá-lo facilmente.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Especialidade</label>
                <select 
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Selecione uma especialidade...</option>
                  {availableSpecialties.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleUpdateSpecialty}
                disabled={isSavingSpecialty || !selectedSpecialty}
                className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingSpecialty ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Alterações
              </motion.button>
            </div>
          </motion.div>
        )}

        {activeTab === 'schedule' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
              <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Gerenciar Disponibilidade Semanal</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 p-6 bg-background/50 rounded-[24px] border border-border">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Dia da Semana</label>
                  <select 
                    value={newSchedule.dayOfWeek}
                    onChange={(e) => setNewSchedule({...newSchedule, dayOfWeek: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-border bg-card outline-none text-foreground"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Início</label>
                  <input 
                    type="time" 
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                    className="w-full p-3 rounded-xl border border-border bg-card outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Fim</label>
                  <input 
                    type="time" 
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                    className="w-full p-3 rounded-xl border border-border bg-card outline-none text-foreground"
                  />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddSchedule}
                  disabled={isSavingSchedule}
                  className="bg-primary text-white p-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar
                </motion.button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm text-foreground/40 uppercase tracking-widest mb-4">Seus Horários</h4>
                <div className="grid gap-4">
                  {schedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-background/50 border border-border rounded-2xl hover:shadow-md transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-32 font-bold text-foreground">
                          {daysOfWeek.find(d => d.value === s.dayOfWeek)?.label}
                        </div>
                        <div className="flex items-center gap-2 text-foreground/60">
                          <Clock className="w-4 h-4" />
                          <span>{s.startTime} - {s.endTime}</span>
                        </div>
                        <div className="text-xs bg-background px-3 py-1 rounded-full text-foreground/60 border border-border">
                          Slots de {s.slotDuration} min
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteSchedule(s.id!)}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-500/10 rounded-full transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <div className="text-center py-12 text-foreground/40 italic">
                      Nenhum horário de disponibilidade configurado.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        <ProfileModal 
          isOpen={isProfileModalOpen} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      </div>
    </Layout>
  );
}
