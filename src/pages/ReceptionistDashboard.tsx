import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../hooks/useAppointments';
import { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Search, CheckCircle2, Clock, Calendar, User, Plus, UserMinus, Bell, AlertCircle, RefreshCw, Users, Stethoscope, Settings, X } from 'lucide-react';
import { format, isToday, parseISO, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import NewAppointmentModal from '../components/NewAppointmentModal';
import ProfileModal from '../components/ProfileModal';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPanel } from '../components/NotificationPanel';
import ConfirmationModal from '../components/ConfirmationModal';
import RescheduleModal from '../components/RescheduleModal';

type Tab = 'checkin' | 'agenda';

export default function ReceptionistDashboard() {
  const { profile } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>('checkin');
  const [globalSearch, setGlobalSearch] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal states
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);

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

  const [showGreeting, setShowGreeting] = useState(true);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

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

  const [showNotifications, setShowNotifications] = useState(false);

  const { updateAppointmentStatus, deleteAppointment, updateAppointment, syncPublicQueue } = useAppointments();

  // Auto-sync public queue for today's appointments
  useEffect(() => {
    if (appointments.length > 0) {
      const today = appointments.filter(a => isToday(parseISO(a.dateTime)));
      today.forEach(apt => {
        syncPublicQueue(apt.id, apt);
      });
    }
  }, [appointments, syncPublicQueue]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Listen to all appointments
    const q = query(
      collection(db, 'appointments'),
      orderBy('dateTime', 'asc')
    );

    const unsubApts = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(docs);
      setLoading(false);
    });

    return () => {
      unsubApts();
    };
  }, []);

  const todayAppointments = appointments.filter(a => isToday(parseISO(a.dateTime)));
  const allUpcoming = appointments.filter(a => 
    ['scheduled', 'checked-in', 'in-progress'].includes(a.status) && 
    (isAfter(parseISO(a.dateTime), new Date()) || isToday(parseISO(a.dateTime)))
  );


  const handleDeleteAppointment = (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Cancelar Agendamento',
      message: 'Tem a certeza que deseja cancelar e eliminar este agendamento?',
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

  const handleCheckIn = async (id: string) => {
    await updateAppointmentStatus(id, 'checked-in');
  };

  const handleNoShow = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Marcar como Ausente',
      message: 'Tem a certeza que deseja marcar este paciente como ausente (no-show)?',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await updateAppointmentStatus(id, 'no-show');
          toast.success('Paciente marcado como ausente');
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (error) {
          toast.error('Erro ao atualizar status');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleReschedule = async (id: string, newDateTime: string) => {
    await updateAppointment(id, { dateTime: newDateTime, status: 'scheduled' });
    toast.success('Consulta reagendada com sucesso!');
  };

  const togglePriority = async (apt: Appointment) => {
    const newPriority = apt.priority === 1 ? 0 : 1;
    await updateAppointment(apt.id, { priority: newPriority });
    toast.success(newPriority === 1 ? 'Prioridade ativada' : 'Prioridade removida');
  };

  const sortedAppointments = [...todayAppointments]
    .filter(a => 
      (a.patientName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
      (a.doctorName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
      (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
    )
    .sort((a, b) => {
      // 1. Priority first
      if ((a.priority || 0) > (b.priority || 0)) return -1;
      if ((a.priority || 0) < (b.priority || 0)) return 1;

      // 2. Checked-in patients first
      if (a.status === 'checked-in' && b.status !== 'checked-in') return -1;
      if (a.status !== 'checked-in' && b.status === 'checked-in') return 1;

      // 3. Arrival order (check-in time) for those checked-in
      if (a.status === 'checked-in' && b.status === 'checked-in') {
        if (a.checkInTime && b.checkInTime) {
          return a.checkInTime.localeCompare(b.checkInTime);
        }
      }

      // 4. Scheduled time
      return a.dateTime.localeCompare(b.dateTime);
    });

  const stats = {
    scheduled: todayAppointments.length,
    present: todayAppointments.filter(a => ['checked-in', 'in-progress', 'completed'].includes(a.status)).length,
    waiting: todayAppointments.filter(a => a.status === 'checked-in').length,
    noShow: todayAppointments.filter(a => a.status === 'no-show').length,
    inProgress: todayAppointments.filter(a => a.status === 'in-progress').length,
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled': return { label: 'Agendado', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20', dot: 'bg-blue-500' };
      case 'pending': return { label: 'Pendente', color: 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse', dot: 'bg-amber-500' };
      case 'checked-in': return { label: 'Na espera', color: 'bg-green-500/10 text-green-500 border-green-500/20', dot: 'bg-green-500' };
      case 'in-progress': return { label: 'Em consulta', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20', dot: 'bg-purple-500' };
      case 'completed': return { label: 'Finalizado', color: 'bg-foreground/10 text-foreground border-border', dot: 'bg-gray-400' };
      case 'no-show': return { label: 'Ausente', color: 'bg-red-500/10 text-red-500 border-red-500/20', dot: 'bg-red-500' };
      case 'cancelled': return { label: 'Cancelado', color: 'bg-background/50 text-gray-500 border-border', dot: 'bg-gray-300' };
      default: return { label: status, color: 'bg-background/50 text-gray-500 border-border', dot: 'bg-gray-300' };
    }
  };

  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const sidebarActions = (
    <div className="space-y-1">
      {[
        { id: 'checkin', label: 'Check-in', icon: CheckCircle2 },
        { id: 'agenda', label: 'Agenda Geral', icon: Calendar },
      ].map((tab) => (
        <motion.button
          key={tab.id}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setActiveTab(tab.id as Tab)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            activeTab === tab.id 
              ? "bg-primary/10 text-primary border border-primary/20" 
              : "text-foreground/70 hover:bg-background hover:text-foreground"
          )}
        >
          <tab.icon className="w-5 h-5" />
          <span className="font-medium">{tab.label}</span>
        </motion.button>
      ))}
    </div>
  );

  const filteredAgenda = allUpcoming.filter(a => 
    (a.patientName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
    (a.doctorName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
    (a.id || '').toLowerCase().includes(globalSearch.toLowerCase())
  );

  return (
    <Layout 
      title="Recepção & Check-in"
      sidebarActions={sidebarActions}
    >
      <div className="max-w-7xl mx-auto space-y-10 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-10"
        >
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
                      Olá, {profile?.name || 'Rececionista'}
                    </motion.h3>
                  ) : (
                    <motion.h3 
                      key="title"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl font-serif font-bold text-primary flex items-center gap-2"
                    >
                      <Users className="w-5 h-5" />
                      SAI Hospitalar - Receção
                    </motion.h3>
                  )}
                </AnimatePresence>
                <p className="text-sm text-foreground/60 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {format(currentTime, "EEEE, d 'de' MMMM '•' HH:mm", { locale: pt })}
                </p>
              </div>
            </div>

            <div className="flex-1 max-w-xl relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 w-5 h-5 group-focus-within:text-primary transition-colors" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Pesquisar paciente ou código..."
                aria-label="Pesquisar paciente ou código"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-12 pr-16 py-3 bg-background/50 rounded-2xl border border-border focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all text-sm text-foreground shadow-sm"
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

            <div className="flex items-center gap-3">
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
                className="p-3 bg-background/50 rounded-2xl text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all border border-border"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* 📊 3. Painel Principal (Resumo do Dia) - Enhanced Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { label: 'Agendados', value: stats.scheduled, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-border' },
              { label: 'Presentes', value: stats.present, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-border' },
              { label: 'Em espera', value: stats.waiting, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-border' },
              { label: 'Faltas', value: stats.noShow, icon: UserMinus, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-border' },
              { label: 'Em consulta', value: stats.inProgress, icon: Stethoscope, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-border' },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card p-6 rounded-[16px] border border-border shadow-sm"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={cn("p-1.5 rounded-md", stat.bg, stat.color)}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">{stat.label}</span>
                </div>
                <p className="text-2xl font-serif font-bold text-foreground">{stat.value}</p>
              </motion.div>
            ))}
          </div>

          {activeTab === 'checkin' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10">
              {/* 📋 4. Lista de Pacientes (Coração do Dashboard) - Enhanced Table */}
              <div className="lg:col-span-3 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-[0.2em] flex items-center gap-3">
                    <Users className="w-5 h-5 text-primary/60" />
                    Lista de Atendimento
                  </h4>
                  <div className="flex gap-4">
                    <span className="flex items-center gap-2 text-[10px] font-bold text-foreground/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Pendente
                    </span>
                    <span className="flex items-center gap-2 text-[10px] font-bold text-foreground/40">
                      <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span> Na espera
                    </span>
                  </div>
                </div>
                
                <div className="bg-card rounded-[40px] shadow-xl shadow-background/50 border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-background/50 text-[10px] text-foreground/60 uppercase tracking-[0.2em] border-b border-border">
                          <th className="px-8 py-6 font-bold">Paciente</th>
                          <th className="px-8 py-6 font-bold">Agendado</th>
                          <th className="px-8 py-6 font-bold">Chegada</th>
                          <th className="px-8 py-6 font-bold">Estado</th>
                          <th className="px-8 py-6 font-bold">Prioridade</th>
                          <th className="px-8 py-6 font-bold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedAppointments.map((apt) => {
                          const statusConfig = getStatusConfig(apt.status);
                          const isWaiting = apt.status === 'checked-in';
                          const isNoShow = apt.status === 'no-show';
                          
                          return (
                            <motion.tr 
                              layout
                              key={apt.id} 
                              className={cn(
                                "transition-all duration-200 group even:bg-background/20 hover:bg-primary/5",
                                apt.priority === 1 ? "bg-amber-500/5 hover:bg-amber-500/10" : "",
                                isWaiting ? "bg-green-500/5" : "",
                                isNoShow ? "bg-red-500/5" : ""
                              )}
                            >
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-4">
                                  <div className={cn(
                                    "w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-serif font-bold shadow-sm",
                                    apt.priority === 1 ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-card border border-border text-foreground/40"
                                  )}>
                                    {apt.patientName?.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-foreground text-base leading-tight">{apt.patientName}</p>
                                    <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1 font-medium">{apt.doctorName}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <div className="flex items-center gap-2 text-sm font-bold text-foreground/40">
                                  <Clock className="w-4 h-4 text-foreground/30" />
                                  {format(parseISO(apt.dateTime), 'HH:mm')}
                                </div>
                              </td>
                              <td className="px-8 py-6">
                                <span className={cn(
                                  "text-sm font-medium",
                                  apt.checkInTime ? "text-foreground" : "text-foreground/30 italic"
                                )}>
                                  {apt.checkInTime ? format(parseISO(apt.checkInTime), 'HH:mm') : '--:--'}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                <span className={cn(
                                  "px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 w-fit shadow-sm",
                                  statusConfig.color
                                )}>
                                  <span className={cn("w-2 h-2 rounded-full animate-pulse", statusConfig.dot)}></span>
                                  {statusConfig.label}
                                </span>
                              </td>
                              <td className="px-8 py-6">
                                {apt.priority === 1 ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-amber-500 text-white rounded-lg text-[9px] font-black uppercase tracking-tighter">Prioritário</span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-foreground/30 font-medium uppercase tracking-widest">Normal</span>
                                )}
                              </td>
                              <td className="px-8 py-6 text-right">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {apt.status === 'pending' && (
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => updateAppointmentStatus(apt.id, 'scheduled')}
                                      className="p-2.5 text-green-500 hover:bg-green-500/10 rounded-xl transition-all shadow-sm bg-card border border-green-500/20"
                                      title="Confirmar Agendamento"
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </motion.button>
                                  )}
                                  {apt.status === 'scheduled' && (
                                    <motion.button 
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      onClick={() => handleCheckIn(apt.id)}
                                      className="p-2.5 text-green-500 hover:bg-green-500/10 rounded-xl transition-all shadow-sm bg-card border border-green-500/20"
                                      title="Check-in"
                                    >
                                      <CheckCircle2 className="w-5 h-5" />
                                    </motion.button>
                                  )}
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => setReschedulingApt(apt)}
                                    className="p-2.5 text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all shadow-sm bg-card border border-blue-500/20"
                                    title="Reagendar"
                                  >
                                    <RefreshCw className="w-5 h-5" />
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => togglePriority(apt)}
                                    className={cn(
                                      "p-2.5 rounded-xl transition-all shadow-sm border",
                                      apt.priority === 1 ? "text-amber-500 bg-amber-500/10 border-amber-500/20" : "text-foreground/30 bg-card border-border hover:text-amber-500 hover:bg-amber-500/10 hover:border-amber-500/20"
                                    )}
                                    title="Atendimento Prioritário"
                                  >
                                    <AlertCircle className="w-5 h-5" />
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleNoShow(apt.id)}
                                    className="p-2.5 text-red-500 hover:bg-red-500/10 rounded-xl transition-all shadow-sm bg-card border border-red-500/20"
                                    title="Marcar como ausente"
                                  >
                                    <UserMinus className="w-5 h-5" />
                                  </motion.button>
                                </div>
                              </td>
                            </motion.tr>
                          );
                        })}
                        {sortedAppointments.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 bg-background/50 rounded-full flex items-center justify-center mx-auto mb-4 text-foreground/20">
                                  <Search className="w-8 h-8" />
                                </div>
                                <h4 className="text-xl font-serif font-bold text-foreground">Sem resultados</h4>
                                <p className="text-sm text-foreground/40 mt-1">
                                  {globalSearch ? `Nenhum agendamento encontrado para "${globalSearch}" hoje.` : 'Nenhum agendamento para hoje.'}
                                </p>
                                {globalSearch && (
                                  <button 
                                    onClick={() => setGlobalSearch('')}
                                    className="text-primary text-sm font-medium hover:underline mt-4 px-4 py-2 bg-primary/5 rounded-full"
                                  >
                                    Limpar busca
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ⚡ 5. Painel de Ações Rápidas - Enhanced Buttons */}
              <div className="space-y-8">
                <div className="bg-card p-8 rounded-[40px] border border-border shadow-xl shadow-background/50">
                  <h5 className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-8 px-2">Ações Rápidas</h5>
                  <div className="grid grid-cols-1 gap-5">
                    <motion.button 
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setIsNewAppointmentModalOpen(true)}
                      className="w-full flex items-center gap-5 p-6 bg-primary text-white rounded-3xl shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all group"
                    >
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-90 transition-transform duration-500">
                        <Plus className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-base leading-tight">Novo Agendamento</p>
                        <p className="text-[10px] opacity-70 uppercase tracking-widest mt-1">Encaixes ou presenciais</p>
                      </div>
                    </motion.button>

                    <motion.button 
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const input = document.querySelector('input[placeholder*="Pesquisar"]') as HTMLInputElement;
                        input?.focus();
                      }}
                      className="w-full flex items-center gap-5 p-5 bg-card border border-border rounded-3xl hover:bg-background/50 hover:border-primary/30 transition-all"
                    >
                      <div className="w-12 h-12 bg-green-500/10 text-green-600 rounded-2xl flex items-center justify-center">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-foreground">Check-in Rápido</p>
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1">Confirmar presença</p>
                      </div>
                    </motion.button>

                    <motion.button 
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        const firstPending = sortedAppointments.find(a => a.status === 'scheduled');
                        if (firstPending) togglePriority(firstPending);
                      }}
                      className="w-full flex items-center gap-5 p-5 bg-card border border-border rounded-3xl hover:bg-background/50 hover:border-primary/30 transition-all"
                    >
                      <div className="w-12 h-12 bg-amber-500/10 text-amber-600 rounded-2xl flex items-center justify-center">
                        <AlertCircle className="w-7 h-7" />
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sm text-foreground">Emergência</p>
                        <p className="text-[10px] text-foreground/40 uppercase tracking-widest mt-1">Atendimento Prioritário</p>
                      </div>
                    </motion.button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'agenda' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-xs font-bold text-foreground/60 uppercase tracking-[0.2em] flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-primary/60" />
                  Agenda Geral de Consultas
                </h4>
              </div>
              
              <div className="bg-card rounded-[40px] shadow-xl shadow-background/50 border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-background/50 text-[10px] text-foreground/60 uppercase tracking-[0.2em] border-b border-border">
                        <th className="px-8 py-6 font-bold">Data</th>
                        <th className="px-8 py-6 font-bold">Horário</th>
                        <th className="px-8 py-6 font-bold">Paciente</th>
                        <th className="px-8 py-6 font-bold">Médico</th>
                        <th className="px-8 py-6 font-bold">Estado</th>
                        <th className="px-8 py-6 font-bold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAgenda.map((apt) => (
                        <tr key={apt.id} className="hover:bg-background/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-foreground">{format(parseISO(apt.dateTime), 'dd/MM/yyyy')}</span>
                              <span className="text-[10px] text-foreground/40 uppercase font-medium">{format(parseISO(apt.dateTime), 'EEEE', { locale: pt })}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="text-sm font-bold text-primary">{format(parseISO(apt.dateTime), 'HH:mm')}</span>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-bold text-foreground">{apt.patientName}</p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-xs text-foreground/60 font-medium">{apt.doctorName}</p>
                          </td>
                          <td className="px-8 py-6">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                              apt.status === 'checked-in' ? 'bg-green-500/10 text-green-500 border border-green-500/20' : 
                              apt.status === 'scheduled' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-background/50 text-foreground/60 border border-border'
                            )}>
                              {apt.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button 
                              onClick={() => setReschedulingApt(apt)}
                              className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors border border-transparent hover:border-blue-500/20"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {allUpcoming.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-20 text-center">
                            <div className="flex flex-col items-center gap-4">
                              <div className="w-16 h-16 bg-background/50 rounded-full flex items-center justify-center text-foreground/20">
                                <Calendar className="w-8 h-8" />
                              </div>
                              <div className="max-w-xs mx-auto">
                                <p className="text-sm font-serif font-bold text-foreground">Nenhum agendamento futuro</p>
                                <p className="text-xs text-foreground/40 mt-1">
                                  {globalSearch ? `Sem resultados para "${globalSearch}" nos próximos dias.` : 'Não há pacientes agendados para datas futuras.'}
                                </p>
                                {globalSearch && (
                                  <button 
                                    onClick={() => setGlobalSearch('')}
                                    className="text-primary text-xs font-medium hover:underline mt-4"
                                  >
                                    Limpar busca
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      <NewAppointmentModal 
        isOpen={isNewAppointmentModalOpen} 
        onClose={() => setIsNewAppointmentModalOpen(false)} 
      />

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      <RescheduleModal
        isOpen={!!reschedulingApt}
        onClose={() => setReschedulingApt(null)}
        appointment={reschedulingApt}
        onReschedule={handleReschedule}
      />

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
