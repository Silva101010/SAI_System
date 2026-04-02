import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useAppointments } from '../hooks/useAppointments';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Clock, CheckCircle2, Play, User, AlertCircle, RefreshCw, Calendar, Settings, Save, Plus, Trash2, Stethoscope } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Appointment, Specialty, DoctorSchedule } from '../types';
import { useState, useEffect } from 'react';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export default function DoctorDashboard() {
  const { profile } = useAuth();
  const { appointments, loading, updateAppointmentStatus } = useAppointments(profile?.uid, 'doctor');
  const [activeTab, setActiveTab] = useState<'queue' | 'specialty' | 'schedule' | 'info'>('queue');
  
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

  useEffect(() => {
    if (profile) {
      setDoctorInfo({
        name: profile.name || '',
        crm: profile.crm || '',
        bio: profile.bio || '',
        contact: profile.contact || ''
      });
      setSelectedSpecialty(profile.specialty || '');
    }
  }, [profile]);

  // Schedule State
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '17:00',
    slotDuration: 20
  });

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
    .sort((a, b) => {
      // Sort by status (in-progress first), then by scheduled time
      if (a.status === 'in-progress') return -1;
      if (b.status === 'in-progress') return 1;
      return parseISO(a.dateTime).getTime() - parseISO(b.dateTime).getTime();
    });

  // Scheduled for today but not checked in yet
  const pending = appointments.filter(a => 
    isToday(parseISO(a.dateTime)) && a.status === 'scheduled'
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
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Atendimento</p>
        <button 
          onClick={() => setActiveTab('queue')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
            activeTab === 'queue' ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Users className="w-5 h-5" />
          Fila de Espera
        </button>
      </div>

      <div className="space-y-1">
        <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Configurações</p>
        <button 
          onClick={() => setActiveTab('info')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
            activeTab === 'info' ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <User className="w-5 h-5" />
          Perfil Profissional
        </button>
        <button 
          onClick={() => setActiveTab('specialty')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
            activeTab === 'specialty' ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Stethoscope className="w-5 h-5" />
          Especialidade
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
            activeTab === 'schedule' ? "bg-primary text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <Clock className="w-5 h-5" />
          Horários
        </button>
      </div>

      {/* Quick Stats in Sidebar */}
      <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 mx-2">
        <h4 className="text-[10px] text-primary font-bold uppercase tracking-widest mb-3">Hoje</h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">Agendados</span>
            <span className="text-xs font-bold text-primary">{appointments.filter(a => isToday(parseISO(a.dateTime))).length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] text-gray-500">Concluídos</span>
            <span className="text-xs font-bold text-primary">{appointments.filter(a => isToday(parseISO(a.dateTime)) && a.status === 'completed').length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="Painel Médico" sidebarActions={sidebarActions}>
      <div className="max-w-6xl mx-auto">
        {/* Main Content Area */}
        <div className="space-y-8">
          {activeTab === 'queue' && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column: Current Patient & Queue */}
              <div className="xl:col-span-2 space-y-8">
              {/* Current Patient Card */}
              <section>
                <h4 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Em Atendimento</h4>
                {currentPatient ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-primary text-white p-8 rounded-[32px] shadow-xl relative overflow-hidden"
                  >
                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                            <User className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-2xl font-serif font-bold">{currentPatient.patientName}</h3>
                            <p className="text-white/70 text-sm">ID: {currentPatient.patientId?.slice(0, 8) || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-full backdrop-blur-md text-sm">
                          Iniciado às {format(new Date(), 'HH:mm')}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-xs text-white/50 uppercase tracking-tighter mb-1">Horário Agendado</p>
                          <p className="font-medium">{format(parseISO(currentPatient.dateTime), 'HH:mm')}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                          <p className="text-xs text-white/50 uppercase tracking-tighter mb-1">Check-in Realizado</p>
                          <p className="font-medium">{currentPatient.checkInTime ? format(parseISO(currentPatient.checkInTime), 'HH:mm') : '--:--'}</p>
                        </div>
                      </div>

                      <button 
                        onClick={() => handleFinishConsultation(currentPatient.id)}
                        className="w-full bg-white text-primary py-4 rounded-full font-bold hover:bg-gray-100 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                        Finalizar Consulta
                      </button>
                    </div>
                    {/* Decorative background element */}
                    <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                  </motion.div>
                ) : (
                  <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-200 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-400 font-serif italic text-lg">Nenhum paciente em atendimento no momento.</p>
                    {nextInLine.length > 0 && (
                      <button 
                        onClick={() => handleStartConsultation(nextInLine[0].id)}
                        className="mt-6 bg-primary text-white px-8 py-3 rounded-full font-medium hover:bg-primary-hover transition-all"
                      >
                        Chamar Próximo: {nextInLine[0].patientName}
                      </button>
                    )}
                  </div>
                )}
              </section>

              {/* Active Queue List */}
              <section>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Fila de Espera ({nextInLine.length})
                  </h4>
                  <button className="text-xs text-primary font-bold uppercase tracking-widest flex items-center gap-1 hover:underline">
                    <RefreshCw className="w-3 h-3" /> Atualizar Fila
                  </button>
                </div>
                
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {nextInLine.map((apt, index) => (
                      <motion.div
                        key={apt.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex items-center justify-between group hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center font-bold text-primary">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-serif font-bold text-foreground">{apt.patientName}</h5>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Agendado: {format(parseISO(apt.dateTime), 'HH:mm')}</span>
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-accent" /> Chegou: {apt.checkInTime ? format(parseISO(apt.checkInTime), 'HH:mm') : '--:--'}</span>
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleStartConsultation(apt.id)}
                          className="opacity-0 group-hover:opacity-100 bg-primary text-white p-2 rounded-full transition-all hover:scale-110 shadow-md"
                        >
                          <Play className="w-5 h-5 fill-current" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {nextInLine.length === 0 && (
                    <div className="p-8 text-center text-gray-400 italic bg-gray-50 rounded-[24px] border border-dashed border-gray-200">
                      Nenhum paciente aguardando na fila ativa.
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Stats & Pending */}
            <div className="space-y-8">
              {/* Daily Stats */}
              <section className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
                <h4 className="text-sm text-gray-500 uppercase tracking-widest mb-6">Resumo do Dia</h4>
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-info/10 text-info rounded-xl flex items-center justify-center">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Total Agendado</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{appointments.filter(a => isToday(parseISO(a.dateTime))).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent/10 text-accent rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Concluídos</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{appointments.filter(a => isToday(parseISO(a.dateTime)) && a.status === 'completed').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Faltas</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">{appointments.filter(a => isToday(parseISO(a.dateTime)) && a.status === 'no-show').length}</span>
                  </div>
                </div>
              </section>

              {/* Pending Check-in */}
              <section>
                <h4 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Aguardando Check-in ({pending.length})</h4>
                <div className="space-y-3">
                  {pending.map((apt) => (
                    <div key={apt.id} className="bg-white/60 p-4 rounded-[20px] border border-gray-100 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{apt.patientName}</p>
                        <p className="text-xs text-gray-500">{format(parseISO(apt.dateTime), 'HH:mm')}</p>
                      </div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-pulse"></div>
                    </div>
                  ))}
                  {pending.length === 0 && (
                    <p className="text-xs text-gray-400 text-center italic">Todos os pacientes já realizaram check-in ou o horário expirou.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'info' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 max-w-3xl"
          >
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Informações Profissionais</h3>
            <p className="text-gray-500 mb-8">Gerencie seus dados públicos que serão exibidos para os pacientes.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Nome Completo</label>
                <input 
                  type="text"
                  value={doctorInfo.name}
                  onChange={(e) => setDoctorInfo({...doctorInfo, name: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Seu nome completo"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">CRM / Registro Profissional</label>
                <input 
                  type="text"
                  value={doctorInfo.crm}
                  onChange={(e) => setDoctorInfo({...doctorInfo, crm: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="Ex: CRM-SP 123456"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Contato / Telefone</label>
                <input 
                  type="text"
                  value={doctorInfo.contact}
                  onChange={(e) => setDoctorInfo({...doctorInfo, contact: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Biografia / Sobre</label>
                <textarea 
                  value={doctorInfo.bio}
                  onChange={(e) => setDoctorInfo({...doctorInfo, bio: e.target.value})}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all min-h-[120px]"
                  placeholder="Conte um pouco sobre sua experiência e formação..."
                />
              </div>
            </div>

            <button 
              onClick={handleUpdateInfo}
              disabled={isSavingInfo}
              className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSavingInfo ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar Informações
            </button>
          </motion.div>
        )}

        {activeTab === 'specialty' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 max-w-2xl"
          >
            <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Configurar Especialidade</h3>
            <p className="text-gray-500 mb-8">Selecione sua especialidade principal para que os pacientes possam encontrá-lo facilmente.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Especialidade</label>
                <select 
                  value={selectedSpecialty}
                  onChange={(e) => setSelectedSpecialty(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                >
                  <option value="">Selecione uma especialidade...</option>
                  {availableSpecialties.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleUpdateSpecialty}
                disabled={isSavingSpecialty || !selectedSpecialty}
                className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSavingSpecialty ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Alterações
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'schedule' && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
              <h3 className="text-2xl font-serif font-bold mb-6 text-foreground">Gerenciar Disponibilidade Semanal</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mb-8 p-6 bg-gray-50 rounded-[24px]">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Dia da Semana</label>
                  <select 
                    value={newSchedule.dayOfWeek}
                    onChange={(e) => setNewSchedule({...newSchedule, dayOfWeek: parseInt(e.target.value)})}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none"
                  >
                    {daysOfWeek.map(d => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Início</label>
                  <input 
                    type="time" 
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Fim</label>
                  <input 
                    type="time" 
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                    className="w-full p-3 rounded-xl border border-gray-200 bg-white outline-none"
                  />
                </div>
                <button 
                  onClick={handleAddSchedule}
                  disabled={isSavingSchedule}
                  className="bg-primary text-white p-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Adicionar
                </button>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm text-gray-500 uppercase tracking-widest mb-4">Seus Horários</h4>
                <div className="grid gap-4">
                  {schedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all">
                      <div className="flex items-center gap-6">
                        <div className="w-32 font-bold text-foreground">
                          {daysOfWeek.find(d => d.value === s.dayOfWeek)?.label}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{s.startTime} - {s.endTime}</span>
                        </div>
                        <div className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-500">
                          Slots de {s.slotDuration} min
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteSchedule(s.id!)}
                        className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  {schedules.length === 0 && (
                    <div className="text-center py-12 text-gray-400 italic">
                      Nenhum horário de disponibilidade configurado.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        </div>
      </div>
    </Layout>
  );
}
