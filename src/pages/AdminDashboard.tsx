import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, FormEvent } from 'react';
import { collection, getDocs, setDoc, doc, addDoc, query, orderBy, onSnapshot, where, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, DoctorSchedule, Specialty, Appointment } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Users, Calendar, Database, Plus, Trash2, ShieldCheck, Stethoscope, CheckCircle2, Search, CalendarPlus, QrCode, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { format, isToday, parseISO } from 'date-fns';
import NewAppointmentModal from '../components/NewAppointmentModal';
import { useAppointments } from '../hooks/useAppointments';
import ConfirmationModal from '../components/ConfirmationModal';

type AdminTab = 'users' | 'checkin' | 'schedules' | 'specialties' | 'system';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);

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

  // Form states
  const [newSpecialty, setNewSpecialty] = useState('');
  const [newSchedule, setNewSchedule] = useState<Partial<DoctorSchedule>>({
    dayOfWeek: 1,
    startTime: '08:00',
    endTime: '17:00',
    slotDuration: 30
  });

  const { updateAppointmentStatus, deleteAppointment } = useAppointments();

  useEffect(() => {
    // Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as UserProfile));
    });

    // Listen to schedules
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      setSchedules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DoctorSchedule)));
    });

    // Listen to specialties
    const unsubSpecs = onSnapshot(collection(db, 'specialties'), (snapshot) => {
      setSpecialties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Specialty)));
    });

    // Listen to today's appointments
    const qApts = query(collection(db, 'appointments'), orderBy('dateTime', 'asc'));
    const unsubApts = onSnapshot(qApts, (snapshot) => {
      const docs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Appointment))
        .filter(a => isToday(parseISO(a.dateTime)));
      setTodayAppointments(docs);
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubSchedules();
      unsubSpecs();
      unsubApts();
    };
  }, []);

  const seedInitialData = async () => {
    try {
      // Mock Doctors
      const doctors = [
        { uid: 'doc1', name: 'Dr. Ricardo Santos', email: 'ricardo@hospital.com', role: 'doctor', specialty: 'Cardiologia', createdAt: new Date().toISOString() },
        { uid: 'doc2', name: 'Dra. Ana Oliveira', email: 'ana@hospital.com', role: 'doctor', specialty: 'Pediatria', createdAt: new Date().toISOString() },
        { uid: 'doc3', name: 'Dr. Carlos Mendes', email: 'carlos@hospital.com', role: 'doctor', specialty: 'Ortopedia', createdAt: new Date().toISOString() },
      ];

      for (const docData of doctors) {
        await setDoc(doc(db, 'users', docData.uid), docData);
      }

      // Mock Schedules
      const mockSchedules = [
        { doctorId: 'doc1', dayOfWeek: 1, startTime: '08:00', endTime: '12:00', slotDuration: 20 },
        { doctorId: 'doc2', dayOfWeek: 1, startTime: '14:00', endTime: '18:00', slotDuration: 30 },
      ];

      for (const sched of mockSchedules) {
        await addDoc(collection(db, 'schedules'), sched);
      }

      toast.success('Dados iniciais semeados com sucesso!');
    } catch (error) {
      console.error('Error seeding data:', error);
      toast.error('Erro ao semear dados.');
    }
  };

  const updateUserRole = async (uid: string, newRole: any) => {
    try {
      await setDoc(doc(db, 'users', uid), { role: newRole }, { merge: true });
      toast.success('Role atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar role.');
    }
  };

  const handleAddSpecialty = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSpecialty.trim()) return;
    try {
      await addDoc(collection(db, 'specialties'), { name: newSpecialty.trim() });
      setNewSpecialty('');
      toast.success('Especialidade adicionada!');
    } catch (error) {
      toast.error('Erro ao adicionar especialidade');
    }
  };

  const handleDeleteSpecialty = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Especialidade',
      message: 'Tem a certeza que deseja remover esta especialidade? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await deleteDoc(doc(db, 'specialties', id));
          toast.success('Especialidade removida');
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (error) {
          toast.error('Erro ao remover especialidade');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleAddSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSchedule.doctorId) {
      toast.error('Selecione um médico');
      return;
    }
    try {
      await addDoc(collection(db, 'schedules'), newSchedule);
      toast.success('Horário adicionado!');
    } catch (error) {
      toast.error('Erro ao adicionar horário');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Horário',
      message: 'Tem a certeza que deseja remover este horário de atendimento?',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await deleteDoc(doc(db, 'schedules', id));
          toast.success('Horário removido');
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (error) {
          toast.error('Erro ao remover horário');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleCheckIn = async (id: string, dateTime: string) => {
    if (!isToday(parseISO(dateTime))) {
      toast.error('Check-in só é permitido para agendamentos de hoje.');
      return;
    }
    await updateAppointmentStatus(id, 'checked-in');
  };

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

  const filteredApts = todayAppointments.filter(a => 
    (a.patientName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const [quickPatientName, setQuickPatientName] = useState('');
  const [quickDoctorId, setQuickDoctorId] = useState('');

  const deleteUser = async (uid: string) => {
    if (uid === profile?.uid) {
      toast.error('Você não pode eliminar a sua própria conta.');
      return;
    }
    
    setConfirmModal({
      isOpen: true,
      title: 'Eliminar Utilizador',
      message: 'Tem a certeza que deseja eliminar este utilizador? Todos os dados associados serão perdidos.',
      onConfirm: async () => {
        try {
          setConfirmModal(prev => ({ ...prev, isLoading: true }));
          await deleteDoc(doc(db, 'users', uid));
          toast.success('Utilizador eliminado com sucesso!');
          setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
        } catch (error) {
          console.error('Error deleting user:', error);
          toast.error('Erro ao eliminar utilizador.');
          setConfirmModal(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleQuickAddToQueue = async () => {
    if (!quickPatientName.trim() || !quickDoctorId) {
      toast.error('Preencha o nome e selecione um médico');
      return;
    }
    
    try {
      const doctor = users.find(u => u.uid === quickDoctorId);
      if (!doctor) throw new Error('Médico não encontrado.');

      const appointmentsRef = collection(db, 'appointments');
      const isoString = new Date().toISOString();
      const todayStr = isoString ? isoString.split('T')[0] : '';
      const q = query(
        appointmentsRef, 
        where('doctorId', '==', quickDoctorId),
        where('dateTime', '>=', `${todayStr}T00:00:00Z`),
        where('dateTime', '<=', `${todayStr}T23:59:59Z`)
      );
      
      const snapshot = await getDocs(q);
      const doctorAppointments = snapshot.docs.map(doc => doc.data() as Appointment);

      let nextDateTime: Date;
      const now = new Date();

      if (doctorAppointments.length === 0) {
        nextDateTime = new Date(now);
        nextDateTime.setMinutes(Math.ceil(nextDateTime.getMinutes() / 5) * 5);
        nextDateTime.setSeconds(0);
        nextDateTime.setMilliseconds(0);
      } else {
        const sortedApts = doctorAppointments.sort((a, b) => 
          new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
        );
        const lastAptTime = new Date(sortedApts[0].dateTime);
        nextDateTime = new Date(lastAptTime.getTime() + 20 * 60000);
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
        patientId: 'walk-in-' + Date.now(),
        patientName: quickPatientName.trim(),
        doctorId: quickDoctorId,
        doctorName: doctor.name,
        dateTime: nextDateTime.toISOString(),
        status: 'checked-in',
        createdAt: new Date().toISOString()
      });

      toast.success(`Adicionado à fila para as ${format(nextDateTime, 'HH:mm')}!`);
      setQuickPatientName('');
      setQuickDoctorId('');
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast.error('Erro ao adicionar à fila.');
    }
  };

  const sidebarActions = (
    <div className="space-y-1">
      {[
        { id: 'users', label: 'Utilizadores', icon: Users },
        { id: 'checkin', label: 'Check-in', icon: CheckCircle2 },
        { id: 'schedules', label: 'Calendários', icon: Calendar },
        { id: 'specialties', label: 'Especialidades', icon: Stethoscope },
        { id: 'system', label: 'Sistema', icon: Settings },
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as AdminTab)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
            activeTab === tab.id 
              ? "bg-primary text-white shadow-md" 
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <tab.icon className="w-5 h-5" />
          <span className="font-medium">{tab.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <Layout 
      title={
        activeTab === 'users' ? 'Gestão de Utilizadores' :
        activeTab === 'checkin' ? 'Recepção & Check-in' :
        activeTab === 'schedules' ? 'Gestão de Calendários' :
        activeTab === 'specialties' ? 'Gestão de Especialidades' : 'Configurações do Sistema'
      }
      sidebarActions={sidebarActions}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        <AnimatePresence mode="wait">
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                  <Users className="w-8 h-8 text-info mb-4" />
                  <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Usuários</p>
                  <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                  <Stethoscope className="w-8 h-8 text-accent mb-4" />
                  <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Médicos</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'doctor').length}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                  <Calendar className="w-8 h-8 text-secondary mb-4" />
                  <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Escalas</p>
                  <p className="text-2xl font-bold text-gray-900">{schedules.length}</p>
                </div>
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                  <ShieldCheck className="w-8 h-8 text-primary mb-4" />
                  <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Admins</p>
                  <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'admin').length}</p>
                </div>
              </div>

              <section>
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-serif font-bold text-foreground">Lista de Utilizadores</h4>
                </div>
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-widest">
                        <th className="px-6 py-4 font-bold">Nome</th>
                        <th className="px-6 py-4 font-bold">Email</th>
                        <th className="px-6 py-4 font-bold">Role</th>
                        <th className="px-6 py-4 font-bold text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {users.map((u) => (
                        <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">{u.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                          <td className="px-6 py-4">
                            <select 
                              value={u.role}
                              onChange={(e) => updateUserRole(u.uid, e.target.value)}
                              className="bg-gray-100 text-xs font-bold uppercase px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="patient">Paciente</option>
                              <option value="doctor">Médico</option>
                              <option value="receptionist">Rececionista</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              onClick={() => deleteUser(u.uid)}
                              className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors"
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
            </motion.div>
          )}

          {activeTab === 'checkin' && (
            <motion.div
              key="checkin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input 
                    type="text"
                    placeholder="Buscar paciente por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Nome do paciente..."
                    value={quickPatientName}
                    onChange={(e) => setQuickPatientName(e.target.value)}
                    className="flex-1 px-6 py-4 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <select 
                    value={quickDoctorId}
                    onChange={(e) => setQuickDoctorId(e.target.value)}
                    className="px-6 py-4 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  >
                    <option value="">Médico...</option>
                    {users.filter(u => u.role === 'doctor').map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                  </select>
                  <button 
                    onClick={handleQuickAddToQueue}
                    className="bg-primary text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar à Fila
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-sm text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Agendamentos de Hoje ({todayAppointments.length})
                  </h4>
                  <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-widest">
                          <th className="px-6 py-4 font-bold">Horário</th>
                          <th className="px-6 py-4 font-bold">Paciente</th>
                          <th className="px-6 py-4 font-bold">Médico</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                          <th className="px-6 py-4 font-bold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {filteredApts.map((apt) => (
                          <tr key={apt.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {format(parseISO(apt.dateTime), 'HH:mm')}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-background flex items-center justify-center text-primary">
                                  <UserIcon className="w-4 h-4" />
                                </div>
                                <span className="font-medium text-foreground">{apt.patientName}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">{apt.doctorName}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                apt.status === 'checked-in' ? 'bg-accent/10 text-accent' : 
                                apt.status === 'scheduled' ? 'bg-info/10 text-info' : 'bg-gray-100 text-gray-500'
                              )}>
                                {apt.status === 'checked-in' ? 'Presente' : apt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              {apt.status === 'scheduled' && (
                                <button 
                                  onClick={() => handleCheckIn(apt.id, apt.dateTime)}
                                  className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-primary-hover transition-all"
                                >
                                  Check-in
                                </button>
                              )}
                              {apt.status === 'checked-in' && (
                                <div className="text-accent flex items-center justify-end gap-1 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Confirmado
                                </div>
                              )}
                              <button 
                                onClick={() => handleDeleteAppointment(apt.id)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                title="Eliminar agendamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-primary text-white p-8 rounded-[32px] shadow-xl">
                    <h5 className="text-sm uppercase tracking-widest opacity-70 mb-4">Fluxo de Hoje</h5>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <span className="text-4xl font-serif font-bold">
                          {todayAppointments.filter(a => a.status === 'checked-in' || a.status === 'in-progress' || a.status === 'completed').length}
                        </span>
                        <span className="text-sm opacity-70">Pacientes Presentes</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-white h-full" 
                          style={{ width: `${(todayAppointments.filter(a => a.status === 'checked-in' || a.status === 'in-progress' || a.status === 'completed').length / (todayAppointments.length || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <h5 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-primary" />
                      Check-in por QR Code
                    </h5>
                    <div className="aspect-square bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center">
                      <p className="text-xs text-gray-400 text-center px-4">Aponte a câmera do tablet para o QR Code do paciente</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'specialties' && (
            <motion.div
              key="specialties"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-serif font-bold mb-6">Gestão de Especialidades</h3>
                <form onSubmit={handleAddSpecialty} className="flex gap-4 mb-8">
                  <input 
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Nome da especialidade (ex: Cardiologia)"
                    className="flex-1 px-6 py-3 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <button type="submit" className="bg-primary text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-primary-hover transition-all">
                    <Plus className="w-5 h-5" />
                    Adicionar
                  </button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specialties.map((spec) => (
                    <div key={spec.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Stethoscope className="w-5 h-5 text-primary" />
                        </div>
                        <span className="font-medium text-foreground">{spec.name}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteSpecialty(spec.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'schedules' && (
            <motion.div
              key="schedules"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <h3 className="text-2xl font-serif font-bold mb-6">Gestão de Calendários Semanais</h3>
                <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 p-6 bg-gray-50 rounded-3xl border border-gray-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Médico</label>
                    <select 
                      value={newSchedule.doctorId || ''}
                      onChange={(e) => setNewSchedule({...newSchedule, doctorId: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                    >
                      <option value="">Selecionar Médico</option>
                      {users.filter(u => u.role === 'doctor').map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Dia</label>
                    <select 
                      value={newSchedule.dayOfWeek}
                      onChange={(e) => setNewSchedule({...newSchedule, dayOfWeek: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                    >
                      {days.map((day, i) => <option key={i} value={i}>{day}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Início</label>
                    <input 
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-2">Fim</label>
                    <input 
                      type="time"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                      className="w-full px-4 py-3 bg-white rounded-xl border border-gray-100 outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5" />
                      Adicionar
                    </button>
                  </div>
                </form>
                <div className="space-y-4">
                  {users.filter(u => u.role === 'doctor').map(doctor => {
                    const doctorSchedules = schedules.filter(s => s.doctorId === doctor.uid);
                    if (doctorSchedules.length === 0) return null;
                    return (
                      <div key={doctor.uid} className="p-6 border border-gray-100 rounded-[32px] hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{doctor.name}</h4>
                            <p className="text-xs text-gray-500 uppercase tracking-widest">{doctor.specialty || 'Clínico Geral'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {doctorSchedules.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                              <div className="text-xs">
                                <span className="font-bold text-primary block mb-1">{days[s.dayOfWeek]}</span>
                                <span className="text-gray-500">{s.startTime} - {s.endTime}</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div
              key="system"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-foreground">Configurações Globais</h3>
                    <p className="text-primary">Gerencie parâmetros do sistema e dados iniciais.</p>
                  </div>
                  <button 
                    onClick={seedInitialData}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-primary text-primary rounded-full hover:bg-background transition-all font-medium"
                  >
                    <Database className="w-5 h-5" />
                    Semear Dados Iniciais
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <NewAppointmentModal 
        isOpen={isNewAppointmentModalOpen} 
        onClose={() => setIsNewAppointmentModalOpen(false)} 
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
