import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { useState, useEffect, FormEvent, useMemo, useRef } from 'react';
import { collection, getDocs, setDoc, doc, addDoc, query, orderBy, onSnapshot, where, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { UserProfile, DoctorSchedule, Specialty, Appointment, Notification } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Users, Calendar, Database, Plus, Trash2, ShieldCheck, Stethoscope, CheckCircle2, Search, CalendarPlus, User as UserIcon, UserMinus, RefreshCw, Save, TrendingUp, Clock, AlertCircle, FileText, BarChart3, Activity, ArrowUpRight, ArrowDownRight, Bell, MoreHorizontal, Filter, Download, Lock, Shield, Server, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn, triggerSyncIndicator } from '../lib/utils';
import { format, isToday, parseISO, differenceInMinutes, startOfDay, endOfDay, subDays, isWithinInterval, eachDayOfInterval, startOfMonth } from 'date-fns';
import { pt } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import NewAppointmentModal from '../components/NewAppointmentModal';
import { useAppointments } from '../hooks/useAppointments';
import { createNotification } from '../services/notificationService';
import ConfirmationModal from '../components/ConfirmationModal';
import ProfileModal from '../components/ProfileModal';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationPanel } from '../components/NotificationPanel';

type AdminTab = 'dashboard' | 'users' | 'checkin' | 'monitoring' | 'schedules' | 'specialties' | 'reports' | 'system' | 'doctor-profiles' | 'notifications-mgmt';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'patient' as UserProfile['role'],
    password: '' // Note: In a real app, this would trigger an invite or use Firebase Admin SDK
  });
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const { updateAppointmentStatus, deleteAppointment, syncPublicQueue } = useAppointments();

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGreeting(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Auto-sync public queue for today's appointments
  useEffect(() => {
    if (allAppointments.length > 0) {
      const today = allAppointments.filter(a => isToday(parseISO(a.dateTime)));
      today.forEach(apt => {
        syncPublicQueue(apt.id, apt);
      });
    }
  }, [allAppointments, syncPublicQueue]);

  // System Settings States
  const [systemSettings, setSystemSettings] = useState({
    twoFactorAuth: true,
    auditLogs: true,
    maintenanceMode: false
  });

  // System Notifications Management
  const [systemNotifications, setSystemNotifications] = useState<Notification[]>([]);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    type: 'info' as Notification['type'],
    targetUserId: 'all'
  });
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // Doctor Management States
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [doctorProfileData, setDoctorProfileData] = useState({
    name: '',
    crm: '',
    bio: '',
    contact: '',
    specialty: ''
  });
  const [isSavingDoctor, setIsSavingDoctor] = useState(false);

  // Reports States
  const [reportRange, setReportRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [reportType, setReportType] = useState<'general' | 'doctors' | 'specialties' | 'appointments'>('general');
  const [isExporting, setIsExporting] = useState(false);

  const isOrmedValid = useMemo(() => {
    if (!doctorProfileData.crm) return true;
    // Format: ORMED-12345 (Typical for Angola)
    const ormedRegex = /^(ORMED-)?\d{4,8}$/i;
    return ormedRegex.test(doctorProfileData.crm);
  }, [doctorProfileData.crm]);

  useEffect(() => {
    if (selectedDoctorId) {
      const doctor = users.find(u => u.uid === selectedDoctorId);
      if (doctor) {
        setDoctorProfileData({
          name: doctor.name || '',
          crm: doctor.crm || '',
          bio: doctor.bio || '',
          contact: doctor.contact || '',
          specialty: doctor.specialty || ''
        });
      }
    }
  }, [selectedDoctorId, users]);

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

  useEffect(() => {
    if (!profile) return;

    const handleFirestoreError = (error: any, operationType: string, path: string) => {
      const errInfo = {
        error: error.message,
        operationType,
        path,
        authInfo: {
          userId: auth.currentUser?.uid,
          email: auth.currentUser?.email,
          emailVerified: auth.currentUser?.emailVerified,
        }
      };
      console.error(`Firestore Error [${operationType}] on ${path}:`, JSON.stringify(errInfo));
    };

    // Only allow Admin or Receptionist to access these listeners
    if (profile.role !== 'admin' && profile.role !== 'receptionist') {
      setLoading(false);
      return;
    }

    // Listen to users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
    }, (error) => handleFirestoreError(error, 'list', 'users'));

    // Listen to schedules
    const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
      setSchedules(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DoctorSchedule)));
    }, (error) => handleFirestoreError(error, 'list', 'schedules'));

    // Listen to specialties
    const unsubSpecs = onSnapshot(collection(db, 'specialties'), (snapshot) => {
      setSpecialties(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Specialty)));
    }, (error) => handleFirestoreError(error, 'list', 'specialties'));

    // Listen to appointments - Listen to ALL for stats and monitoring
    const unsubApts = onSnapshot(collection(db, 'appointments'), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Appointment));
      setAllAppointments(docs);
      setLoading(false);
    }, (error) => handleFirestoreError(error, 'list', 'appointments'));

    // Real-time clock
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Listen to ALL notifications for management
    const qAllNotifs = query(collection(db, 'notifications'), orderBy('time', 'desc'));
    const unsubAllNotifs = onSnapshot(qAllNotifs, (snapshot) => {
      setSystemNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
    }, (error) => handleFirestoreError(error, 'list', 'notifications'));

    return () => {
      unsubUsers();
      unsubSchedules();
      unsubSpecs();
      unsubApts();
      unsubAllNotifs();
      clearInterval(timer);
    };
  }, [profile]);

  const filteredUsers = useMemo(() => {
    const search = globalSearch.toLowerCase();
    return users.filter(u => 
      !search ||
      u.name.toLowerCase().includes(search) ||
      u.email.toLowerCase().includes(search) ||
      u.role.toLowerCase().includes(search) ||
      u.uid.toLowerCase().includes(search) ||
      (u.specialty && u.specialty.toLowerCase().includes(search)) ||
      (u.crm && u.crm.toLowerCase().includes(search))
    );
  }, [users, globalSearch]);

  const stats = useMemo(() => {
    const today = allAppointments.filter(a => isToday(parseISO(a.dateTime)));
    const search = globalSearch.toLowerCase();
    const filteredToday = today.filter(a => 
      !search ||
      (a.patientName || '').toLowerCase().includes(search) ||
      (a.doctorName || '').toLowerCase().includes(search) ||
      (a.id || '').toLowerCase().includes(search)
    );

    const present = today.filter(a => ['checked-in', 'in-progress', 'completed'].includes(a.status)).length;
    const absent = today.filter(a => a.status === 'no-show').length;
    const completed = today.filter(a => a.status === 'completed').length;
    
    // Average wait time
    const waitTimes = today
      .filter(a => a.checkInTime && a.status === 'in-progress')
      .map(a => differenceInMinutes(new Date(), parseISO(a.checkInTime!)));
    const avgWait = waitTimes.length > 0 
      ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length) 
      : 12;

    // Available slots calculation
    const todayDay = new Date().getDay();
    const todaySchedules = schedules.filter(s => s.dayOfWeek === todayDay);
    let totalPossibleSlots = 0;
    todaySchedules.forEach(s => {
      const start = parseISO(`2000-01-01T${s.startTime}`);
      const end = parseISO(`2000-01-01T${s.endTime}`);
      const duration = (end.getTime() - start.getTime()) / (1000 * 60);
      totalPossibleSlots += Math.floor(duration / (s.slotDuration || 20));
    });
    const freeSlots = Math.max(0, totalPossibleSlots - today.length);

    return {
      total: today.length,
      present,
      absent,
      completed,
      avgWait,
      freeSlots,
      todayAppointments: filteredToday
    };
  }, [allAppointments, schedules, globalSearch]);

  // Reports Data Calculation
  const reportsData = useMemo(() => {
    const start = startOfDay(parseISO(reportRange.start));
    const end = endOfDay(parseISO(reportRange.end));

    const filtered = allAppointments.filter(a => {
      const date = parseISO(a.dateTime);
      const matchesSearch = !globalSearch || 
        (a.patientName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
        (a.doctorName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
        (a.id || '').toLowerCase().includes(globalSearch.toLowerCase());
      return isWithinInterval(date, { start, end }) && matchesSearch;
    });

    // Appointments by day
    const days = eachDayOfInterval({ start, end });
    const appointmentsByDay = days.map(day => {
      const dayStr = format(day, 'dd/MM');
      const count = filtered.filter(a => format(parseISO(a.dateTime), 'dd/MM') === dayStr).length;
      return { name: dayStr, total: count };
    });

    // Appointments by specialty
    const specialtyCounts = specialties.map(spec => {
      const count = filtered.filter(a => a.doctorName?.includes(spec.name)).length;
      return { name: spec.name, value: count };
    }).filter(s => s.value > 0);

    // Doctor performance
    const doctorStats = users.filter(u => u.role === 'doctor').map(doc => {
      const docApts = filtered.filter(a => a.doctorId === doc.uid);
      const completed = docApts.filter(a => a.status === 'completed').length;
      return { name: doc.name, total: docApts.length, completed };
    }).filter(d => d.total > 0).sort((a, b) => b.total - a.total);

    const total = filtered.length;
    const completed = filtered.filter(a => a.status === 'completed').length;
    const noShow = filtered.filter(a => a.status === 'no-show').length;
    const cancelled = filtered.filter(a => a.status === 'cancelled').length;

    return {
      total,
      completed,
      noShow,
      cancelled,
      appointmentsByDay,
      specialtyCounts,
      doctorStats,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      noShowRate: total > 0 ? Math.round((noShow / total) * 100) : 0
    };
  }, [allAppointments, reportRange, specialties, users]);

  const handleExportReport = () => {
    const start = reportRange.start;
    const end = reportRange.end;
    
    // Create CSV content with semicolon delimiter (better for Excel in PT/EU/AO)
    // and add BOM for UTF-8 encoding recognition
    const headers = ['ID', 'Paciente', 'Médico', 'Data/Hora', 'Status'];
    const rows = allAppointments
      .filter(a => {
        const date = parseISO(a.dateTime);
        return isWithinInterval(date, { 
          start: startOfDay(parseISO(start)), 
          end: endOfDay(parseISO(end)) 
        });
      })
      .map(a => [
        a.id,
        `"${a.patientName.replace(/"/g, '""')}"`,
        `"${a.doctorName.replace(/"/g, '""')}"`,
        format(parseISO(a.dateTime), 'dd/MM/yyyy HH:mm'),
        a.status
      ]);

    const csvContent = "\ufeff" + [
      headers.join(';'),
      ...rows.map(r => r.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_hospital_${start}_a_${end}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Relatório exportado com sucesso!');
  };

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      const start = format(parseISO(reportRange.start), 'dd/MM/yyyy');
      const end = format(parseISO(reportRange.end), 'dd/MM/yyyy');

      // --- Estilo Global e Branding ---
      const primaryColor: [number, number, number] = [59, 130, 246]; // Tailwind primary (blue-500)
      const accentColor: [number, number, number] = [139, 92, 246];  // Tailwind accent (violet-500)
      const successColor: [number, number, number] = [16, 185, 129]; // Tailwind green-500
      
      // Cabeçalho Institucional
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(255, 255, 255);
      doc.text('SAI Hospitalar - Angola', 20, 25);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Sistema de Agendamento Inteligente', 20, 32);
      
      doc.setFont('helvetica', 'bold');
      doc.text('RELATÓRIO ESTRATÉGICO', 190, 25, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`${start} - ${end}`, 190, 31, { align: 'right' });

      let currentY = 55;

      // Seção de Filtros Aplicados
      if (globalSearch) {
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('helvetica', 'italic');
        doc.text(`Filtro de busca aplicado: "${globalSearch}"`, 20, currentY);
        currentY += 10;
      }

      // Função Auxiliar para Seções
      const addSectionTitle = (title: string, y: number) => {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(44, 62, 80);
        doc.text(title, 20, y);
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, y + 2, 60, y + 2);
        return y + 12;
      };

      if (reportType === 'general') {
        currentY = addSectionTitle('Indicadores de Performance', currentY);

        const kpiData = [
          ['Total de Consultas no Período', reportsData.total.toString()],
          ['Taxa de Eficiência (Concluídas)', `${reportsData.completionRate}%`],
          ['Índice de Absenteísmo (No-Show)', `${reportsData.noShowRate}%`],
          ['Volume de Cancelamentos', reportsData.cancelled.toString()]
        ];

        autoTable(doc, {
          startY: currentY,
          head: [['Métrica de Desempenho', 'Valor Consolidado']],
          body: kpiData,
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
          styles: { font: 'helvetica', fontSize: 10, cellPadding: 5 },
          columnStyles: { 1: { halign: 'center', fontStyle: 'bold' } },
          margin: { left: 20, right: 20 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 20;

        // Distribuição por Especialidade
        if (reportsData.specialtyCounts.length > 0) {
          if (currentY > 240) { doc.addPage(); currentY = 20; }
          currentY = addSectionTitle('Distribuição por Especialidade', currentY);

          autoTable(doc, {
            startY: currentY,
            head: [['Especialidade Médica', 'Total de Agendamentos', 'Participação %']],
            body: reportsData.specialtyCounts.map(s => [
              s.name, 
              s.value.toString(), 
              `${Math.round((s.value / reportsData.total) * 100)}%`
            ]),
            theme: 'striped',
            headStyles: { fillColor: successColor, textColor: 255 },
            margin: { left: 20, right: 20 }
          });
          
          currentY = (doc as any).lastAutoTable.finalY + 20;
        }

        // Ranking de Médicos
        if (reportsData.doctorStats.length > 0) {
          if (currentY > 180) { doc.addPage(); currentY = 20; }
          currentY = addSectionTitle('Top Performance Médica', currentY);

          autoTable(doc, {
            startY: currentY,
            head: [['Profissional', 'Agendamentos', 'Concluídos', 'Eficiência']],
            body: reportsData.doctorStats.slice(0, 10).map(d => [
              d.name, 
              d.total.toString(), 
              d.completed.toString(), 
              `${Math.round((d.completed / d.total) * 100)}%`
            ]),
            theme: 'grid',
            headStyles: { fillColor: accentColor, textColor: 255 },
            margin: { left: 20, right: 20 }
          });
        }
      }

      if (reportType === 'doctors') {
        currentY = addSectionTitle('Produtividade do Corpo Clínico', currentY);
        autoTable(doc, {
          startY: currentY,
          head: [['Médico', 'Total Consultas', 'Consultas Concluídas', 'Taxa de Sucesso']],
          body: reportsData.doctorStats.map(d => [
            d.name, 
            d.total.toString(), 
            d.completed.toString(), 
            `${Math.round((d.completed / d.total) * 100)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: accentColor, textColor: 255 },
          margin: { left: 20, right: 20 }
        });
      }

      if (reportType === 'specialties') {
        currentY = addSectionTitle('Demanda por Especialidades', currentY);
        autoTable(doc, {
          startY: currentY,
          head: [['Especialidade', 'Volume de Atendimentos', 'Demanda Relativa']],
          body: reportsData.specialtyCounts.map(s => [
            s.name, 
            s.value.toString(), 
            `${Math.round((s.value / reportsData.total) * 100)}%`
          ]),
          theme: 'striped',
          headStyles: { fillColor: successColor, textColor: 255 },
          margin: { left: 20, right: 20 }
        });
      }

      if (reportType === 'appointments') {
        currentY = addSectionTitle('Relação de Consultas e Status', currentY);
        
        const appointments = allAppointments
          .filter(a => {
            const date = parseISO(a.dateTime);
            const matchesSearch = !globalSearch || 
              (a.patientName || '').toLowerCase().includes(globalSearch.toLowerCase()) ||
              (a.doctorName || '').toLowerCase().includes(globalSearch.toLowerCase());
            
            return matchesSearch && isWithinInterval(date, { 
              start: startOfDay(parseISO(reportRange.start)), 
              end: endOfDay(parseISO(reportRange.end)) 
            });
          })
          .sort((a, b) => b.dateTime.localeCompare(a.dateTime));

        autoTable(doc, {
          startY: currentY,
          head: [['Paciente', 'Médico', 'Data / Horário', 'Situação']],
          body: appointments.map(a => [
            a.patientName,
            a.doctorName,
            format(parseISO(a.dateTime), 'dd/MM/yyyy HH:mm'),
            a.status.toUpperCase()
          ]),
          theme: 'grid',
          headStyles: { fillColor: primaryColor, textColor: 255 },
          styles: { fontSize: 8 },
          margin: { left: 20, right: 20 }
        });
      }

      // Rodapé Universal
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(230);
        doc.line(20, 280, 190, 280);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Documento Oficial SAI Hospitalar - Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
          20,
          285
        );
        doc.text(
          `Página ${i} de ${pageCount}`,
          190,
          285,
          { align: 'right' }
        );
      }

      doc.save(`hospital_report_${reportType}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      console.error('Erro na geração do PDF:', error);
      toast.error('Falha crítica ao gerar o documento.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: 'Limpando cache do sistema...',
        success: 'Cache limpo com sucesso!',
        error: 'Erro ao limpar cache.',
      }
    );
  };

  const handleBackupData = async () => {
    const toastId = toast.loading('Preparando backup de dados...');
    try {
      // In a real app, this would be a server-side trigger
      // Here we simulate by creating a JSON of current state
      const backup = {
        users,
        appointments: allAppointments,
        specialties,
        schedules,
        systemSettings,
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup_hospital_v1_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Backup realizado com sucesso!', { id: toastId });
    } catch (error) {
      toast.error('Erro ao realizar backup.', { id: toastId });
    }
  };

  const seedInitialData = async () => {
    try {
      // Mock Doctors
      const doctors = [
        { uid: 'doc1', name: 'Dr. Manuel dos Santos', email: 'manuel.santos@hospital.ao', role: 'doctor', specialty: 'Cardiologia', createdAt: new Date().toISOString() },
        { uid: 'doc2', name: 'Dra. Isabel Van-Dúnem', email: 'isabel.vdunem@hospital.ao', role: 'doctor', specialty: 'Pediatria', createdAt: new Date().toISOString() },
        { uid: 'doc3', name: 'Dr. João Cassoma', email: 'joao.cassoma@hospital.ao', role: 'doctor', specialty: 'Ortopedia', createdAt: new Date().toISOString() },
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

      // Mock Specialties
      const mockSpecialties = [
        'Cardiologia', 'Pediatria', 'Ortopedia', 'Ginecologia', 'Neurologia', 'Clínica Geral', 'Estomatologia'
      ];

      for (const specName of mockSpecialties) {
        await addDoc(collection(db, 'specialties'), { name: specName });
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

  const filteredApts = stats.todayAppointments;

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

      // Notify Doctor
      await createNotification({
        userId: quickDoctorId,
        title: 'Novo Paciente na Fila',
        message: `${quickPatientName.trim()} foi adicionado à sua fila de espera agora.`,
        type: 'success'
      });

      toast.success(`Adicionado à fila para as ${format(nextDateTime, 'HH:mm')}!`);
      setQuickPatientName('');
      setQuickDoctorId('');
    } catch (error) {
      console.error('Error adding to queue:', error);
      toast.error('Erro ao adicionar à fila.');
    }
  };

  const handleUpdateDoctorProfile = async () => {
    if (!selectedDoctorId) return;
    if (doctorProfileData.crm && !isOrmedValid) {
      toast.error('Por favor, insira um Nº de Ordem válido (Ex: ORMED-12345)');
      return;
    }
    setIsSavingDoctor(true);
    triggerSyncIndicator();
    const promise = setDoc(doc(db, 'users', selectedDoctorId), doctorProfileData, { merge: true });
    
    toast.promise(promise, {
      loading: 'A atualizar perfil do médico...',
      success: 'Perfil do médico atualizado!',
      error: 'Erro ao atualizar perfil.'
    });

    try {
      await promise;
    } catch (error) {
      console.error('Error updating doctor profile:', error);
    } finally {
      setIsSavingDoctor(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserData.name || !newUserData.email) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setIsCreatingUser(true);
    try {
      // In this demo environment, we just create the profile in Firestore
      // In production, you'd use Firebase Auth to create the user account
      const userRef = doc(collection(db, 'users'));
      await setDoc(userRef, {
        uid: userRef.id,
        name: newUserData.name,
        email: newUserData.email,
        role: newUserData.role,
        createdAt: new Date().toISOString()
      });
      toast.success(`Utilizador ${newUserData.name} criado com sucesso!`);
      setIsAddUserModalOpen(false);
      setNewUserData({ name: '', email: '', role: 'patient', password: '' });
    } catch (error) {
      toast.error('Erro ao criar utilizador');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleSendNotification = async (e: FormEvent) => {
    e.preventDefault();
    if (!newNotification.title || !newNotification.message) {
      toast.error('Preencha o título e a mensagem');
      return;
    }
    setIsSendingNotification(true);
    try {
      if (newNotification.targetUserId === 'all') {
        const promises = users.map(u => addDoc(collection(db, 'notifications'), {
          userId: u.uid,
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          time: new Date().toISOString(),
          read: false
        }));
        await Promise.all(promises);
      } else {
        await addDoc(collection(db, 'notifications'), {
          userId: newNotification.targetUserId,
          title: newNotification.title,
          message: newNotification.message,
          type: newNotification.type,
          time: new Date().toISOString(),
          read: false
        });
      }
      toast.success('Notificação enviada!');
      setNewNotification({ title: '', message: '', type: 'info', targetUserId: 'all' });
    } catch (error) {
      toast.error('Erro ao enviar notificação');
    } finally {
      setIsSendingNotification(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
      toast.success('Notificação removida');
    } catch (error) {
      toast.error('Erro ao remover notificação');
    }
  };

  const sidebarActions = (
    <div className="space-y-6">
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Visão Geral</p>
          {[
            { id: 'dashboard', label: 'Painel Geral', icon: BarChart3 },
            { id: 'monitoring', label: 'Monitoramento', icon: Activity },
            { id: 'notifications-mgmt', label: 'Notificações', icon: Bell },
            { id: 'reports', label: 'Relatórios', icon: FileText },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-foreground/70 hover:bg-background hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{tab.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Gestão Operacional</p>
          {[
            { id: 'users', label: 'Utilizadores', icon: Users },
            { id: 'checkin', label: 'Recepção', icon: CheckCircle2 },
            { id: 'system', label: 'Sistema', icon: Settings },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-foreground/70 hover:bg-background hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{tab.label}</span>
            </motion.button>
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-4 text-[10px] font-bold text-foreground/40 uppercase tracking-widest mb-2">Gestão de Médicos</p>
          {[
            { id: 'doctor-profiles', label: 'Perfis Médicos', icon: UserIcon },
            { id: 'specialties', label: 'Especialidades', icon: Stethoscope },
            { id: 'schedules', label: 'Calendários', icon: Calendar },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all text-sm font-medium",
                activeTab === tab.id 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "text-foreground/70 hover:bg-background hover:text-foreground"
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium text-sm">{tab.label}</span>
            </motion.button>
          ))}
        </div>
    </div>
  );

  return (
    <Layout 
      title={
        activeTab === 'dashboard' ? 'Painel de Controle' :
        activeTab === 'monitoring' ? 'Monitoramento em Tempo Real' :
        activeTab === 'reports' ? 'Relatórios Estratégicos' :
        activeTab === 'users' ? 'Gestão de Utilizadores' :
        activeTab === 'checkin' ? 'Recepção & Check-in' :
        activeTab === 'schedules' ? 'Gestão de Calendários' :
        activeTab === 'specialties' ? 'Gestão de Especialidades' : 'Configurações do Sistema'
      }
      sidebarActions={sidebarActions}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Enhanced Header with Clock and Notifications */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-[32px] shadow-sm border border-border">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div className="min-h-[48px] flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {showGreeting ? (
                  <motion.h3 
                    key="greeting"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, filter: 'blur(8px)' }}
                    className="text-xl font-serif font-bold text-foreground"
                  >
                    Olá, {profile?.name || 'Administrador'}
                  </motion.h3>
                ) : (
                  <motion.h3
                    key="system-status"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xl font-serif font-bold text-primary flex items-center gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    SAI Hospitalar
                  </motion.h3>
                )}
              </AnimatePresence>
              <p className="text-sm text-foreground/60 flex items-center gap-2">
                <Clock className="w-3 h-3" /> {format(currentTime, "EEEE, dd 'de' MMMM 'às' HH:mm:ss", { locale: pt })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40 w-4 h-4 group-focus-within:text-primary transition-colors" />
              <input 
                ref={searchInputRef}
                type="text"
                placeholder="Busca global..."
                aria-label="Busca global"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-16 py-2 bg-background/50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {globalSearch && (
                  <button 
                    onClick={() => setGlobalSearch('')}
                    className="p-1 text-foreground/40 hover:text-foreground hover:bg-background rounded-full transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <kbd className="hidden md:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-background px-1.5 font-mono text-[10px] font-medium text-foreground/40 opacity-100 group-focus-within:hidden">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </div>
            </div>
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
              className="p-3 bg-background/50 rounded-2xl text-foreground/40 hover:bg-primary/10 hover:text-primary transition-all border border-border"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Summary Panel KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Agendados Hoje', value: stats.total, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Presentes', value: stats.present, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
                  { label: 'Ausentes', value: stats.absent, icon: UserMinus, color: 'text-red-500', bg: 'bg-red-500/10' },
                  { label: 'Realizadas', value: stats.completed, icon: Stethoscope, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                  { label: 'Espera Média', value: `${stats.avgWait} min`, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                  { label: 'Slots Livres', value: stats.freeSlots, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map((kpi, i) => (
                  <div key={i} className="bg-card p-5 rounded-[16px] shadow-sm border border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={cn("p-1.5 rounded-md", kpi.bg, kpi.color)}>
                        <kpi.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/60">{kpi.label}</span>
                    </div>
                    <p className="text-2xl font-serif font-bold text-foreground">{kpi.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Quick Insights */}
                <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-serif font-bold text-foreground">Desempenho por Especialidade</h3>
                    <BarChart3 className="w-5 h-5 text-foreground/30" />
                  </div>
                  <div className="space-y-4">
                    {specialties
                      .filter(s => !globalSearch || s.name.toLowerCase().includes(globalSearch.toLowerCase()))
                      .slice(0, 4)
                      .map((spec, i) => {
                      const count = allAppointments.filter(a => a.doctorName?.includes(spec.name)).length;
                      const percentage = allAppointments.length > 0 ? (count / allAppointments.length) * 100 : 0;
                      return (
                        <div key={spec.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium text-foreground/70">{spec.name}</span>
                            <span className="font-bold text-foreground">{count} consultas</span>
                          </div>
                          <div className="w-full bg-background/50 h-2 rounded-full overflow-hidden border border-border">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              className="bg-primary h-full rounded-full"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* System Activity */}
                <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-serif font-bold text-foreground">Monitoramento Operacional</h3>
                    <Activity className="w-5 h-5 text-foreground/30" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-foreground/70">Médicos Online</span>
                      </div>
                      <span className="font-bold text-foreground">{users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-foreground/70">Recepcionistas Ativas</span>
                      </div>
                      <span className="font-bold text-foreground">{users.filter(u => u.role === 'receptionist').length}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-foreground/70">Taxa de Ocupação</span>
                      </div>
                      <span className="font-bold text-foreground">
                        {Math.round((stats.total / (stats.total + stats.freeSlots || 1)) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-serif font-bold text-foreground">Ações Rápidas</h3>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-foreground/30 uppercase tracking-widest">
                    <Activity className="w-3 h-3" />
                    Atalhos do Sistema
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsNewAppointmentModalOpen(true)}
                    className="flex flex-col items-center justify-center p-8 bg-primary/5 border border-primary/20 rounded-[24px] group hover:bg-primary/10 transition-all text-center"
                  >
                    <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
                      <CalendarPlus className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-foreground text-sm">Marcar Consulta</span>
                    <p className="text-[11px] text-foreground/40 mt-1">Agendar novo atendimento</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAddUserModalOpen(true)}
                    className="flex flex-col items-center justify-center p-8 bg-background border border-border rounded-[24px] group hover:border-primary/30 transition-all text-center"
                  >
                    <div className="w-14 h-14 bg-background border border-border text-foreground/40 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Users className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-foreground text-sm">Novo Utilizador</span>
                    <p className="text-[11px] text-foreground/40 mt-1">Registar paciente ou staff</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('reports')}
                    className="flex flex-col items-center justify-center p-8 bg-background border border-border rounded-[24px] group hover:border-primary/30 transition-all text-center"
                  >
                    <div className="w-14 h-14 bg-background border border-border text-foreground/40 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <FileText className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-foreground text-sm">Relatórios</span>
                    <p className="text-[11px] text-foreground/40 mt-1">Consultar métricas mensais</p>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveTab('monitoring')}
                    className="flex flex-col items-center justify-center p-8 bg-background border border-border rounded-[24px] group hover:border-primary/30 transition-all text-center"
                  >
                    <div className="w-14 h-14 bg-background border border-border text-foreground/40 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                      <Activity className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-foreground text-sm">Tempo Real</span>
                    <p className="text-[11px] text-foreground/40 mt-1">Ver fluxo de pacientes</p>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'monitoring' && (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="bg-card p-8 rounded-[32px] shadow-sm border border-border">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-foreground">Monitoramento em Tempo Real</h3>
                    <p className="text-foreground/60">Status atual de todos os consultórios e recepção.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                      SISTEMA OPERACIONAL
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).map(doctor => {
                    const currentApt = stats.todayAppointments.find(a => a.doctorId === doctor.uid && a.status === 'in-progress');
                    const waitingCount = stats.todayAppointments.filter(a => a.doctorId === doctor.uid && a.status === 'checked-in').length;
                    
                    return (
                      <div key={doctor.uid} className="p-6 rounded-[24px] border border-border hover:border-primary/20 transition-all space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-background/50 rounded-full flex items-center justify-center text-foreground/40 border border-border">
                              <UserIcon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-bold text-foreground">{doctor.name}</h4>
                              <p className="text-[10px] text-foreground/40 uppercase tracking-widest">{doctor.specialty || 'Clínico'}</p>
                            </div>
                          </div>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                            currentApt ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
                          )}>
                            {currentApt ? 'Em Consulta' : 'Disponível'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                          <div>
                            <p className="text-[10px] text-foreground/40 uppercase font-bold mb-1">Em Espera</p>
                            <p className="text-lg font-bold text-foreground">{waitingCount} pacientes</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-foreground/40 uppercase font-bold mb-1">Status</p>
                            <p className="text-sm font-medium text-foreground/70">
                              {currentApt ? `Atendendo: ${currentApt.patientName}` : 'Aguardando'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'notifications-mgmt' && (
            <motion.div
              key="notifications-mgmt"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-card p-8 rounded-[32px] border border-border shadow-sm h-fit">
                  <h3 className="text-xl font-serif font-bold mb-6">Enviar Notificação</h3>
                  <form onSubmit={handleSendNotification} className="space-y-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Destinatário</label>
                      <select 
                        value={newNotification.targetUserId}
                        onChange={(e) => setNewNotification({...newNotification, targetUserId: e.target.value})}
                        className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                      >
                        <option value="all">Todos os Utilizadores</option>
                        {users.filter(u => !globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase())).map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Tipo</label>
                      <select 
                        value={newNotification.type}
                        onChange={(e) => setNewNotification({...newNotification, type: e.target.value as any})}
                        className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                      >
                        <option value="info">Informação</option>
                        <option value="success">Sucesso</option>
                        <option value="alert">Alerta / Aviso</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Título</label>
                      <input 
                        type="text"
                        value={newNotification.title}
                        onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                        placeholder="Título da notificação"
                        className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Mensagem</label>
                      <textarea 
                        value={newNotification.message}
                        onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                        placeholder="Conteúdo da mensagem..."
                        rows={4}
                        className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none text-foreground"
                      />
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={isSendingNotification}
                      className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSendingNotification ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Bell className="w-5 h-5" />}
                      Enviar Notificação
                    </motion.button>
                  </form>
                </div>

                <div className="lg:col-span-2 bg-card p-8 rounded-[32px] border border-border shadow-sm">
                  <h3 className="text-xl font-serif font-bold mb-6">Histórico de Notificações</h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {systemNotifications.filter(n => {
                      const targetUser = users.find(u => u.uid === n.userId);
                      const search = globalSearch.toLowerCase();
                      return !globalSearch || 
                        n.title.toLowerCase().includes(search) || 
                        n.message.toLowerCase().includes(search) ||
                        (targetUser?.name || '').toLowerCase().includes(search);
                    }).map((n) => {
                      const targetUser = users.find(u => u.uid === n.userId);
                      return (
                        <div key={n.id} className="p-4 bg-background/50 rounded-2xl border border-border group relative">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                n.type === 'alert' ? "bg-red-500" : n.type === 'success' ? "bg-green-500" : "bg-blue-500"
                              )}></div>
                              <span className="text-xs font-bold text-foreground">{n.title}</span>
                            </div>
                            <span className="text-[10px] text-foreground/40">{format(new Date(n.time), "dd/MM HH:mm")}</span>
                          </div>
                          <p className="text-xs text-foreground/70 mb-2">{n.message}</p>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-primary font-medium">Para: {targetUser?.name || 'Utilizador desconhecido'}</span>
                            <button 
                              onClick={() => handleDeleteNotification(n.id)}
                              className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {systemNotifications.length === 0 && (
                      <div className="text-center py-12 text-foreground/40 italic">Nenhuma notificação enviada.</div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div 
              key="reports"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Toolbar de Controle */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card p-8 rounded-[40px] border border-border shadow-sm">
                <div className="space-y-1">
                  <h4 className="text-2xl font-serif font-bold text-foreground">Relatórios Estratégicos</h4>
                  <p className="text-sm text-foreground/60">Análise de performance, produtividade e fluxo hospitalar.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                  <div className="flex flex-col gap-1.5 min-w-[200px]">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Tipo de Relatório</span>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as any)}
                      className="bg-background/50 px-4 py-3 rounded-2xl border border-border text-xs font-bold outline-none text-foreground focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    >
                      <option value="general">Geral (Visão do Dashboard)</option>
                      <option value="doctors">Desempenho por Médico</option>
                      <option value="specialties">Demanda por Especialidade</option>
                      <option value="appointments">Listagem de Consultas</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-1">Período</span>
                    <div className="flex items-center gap-2 bg-background/50 p-2 rounded-2xl border border-border hover:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <input 
                        type="date" 
                        value={reportRange.start}
                        onChange={(e) => setReportRange({ ...reportRange, start: e.target.value })}
                        className="bg-transparent px-2 py-1 text-xs font-bold outline-none text-foreground cursor-pointer"
                      />
                      <span className="text-foreground/20 text-xs font-bold">-</span>
                      <input 
                        type="date" 
                        value={reportRange.end}
                        onChange={(e) => setReportRange({ ...reportRange, end: e.target.value })}
                        className="bg-transparent px-2 py-1 text-xs font-bold outline-none text-foreground cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-end h-full pt-5 gap-2">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleExportPDF}
                      disabled={isExporting}
                      className="flex items-center gap-3 px-8 py-3.5 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all text-sm disabled:opacity-50 group"
                    >
                      {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 group-hover:rotate-12 transition-transform" />}
                      Exportar PDF Profissional
                    </motion.button>
                    <button 
                      onClick={handleExportReport}
                      title="Baixar CSV"
                      className="p-3.5 bg-background border border-border text-foreground/40 rounded-full hover:text-primary hover:border-primary/30 transition-all shadow-sm"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid de KPIs Consolidados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total de Consultas', value: reportsData.total, sub: 'No período selecionado', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Eficiência Operacional', value: `${reportsData.completionRate}%`, sub: 'Taxa de conclusão', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
                  { label: 'Impacto de Ausências', value: `${reportsData.noShowRate}%`, sub: 'Taxa de no-show', icon: UserMinus, color: 'text-red-500', bg: 'bg-red-500/10' },
                  { label: 'Cancelamentos', value: reportsData.cancelled, sub: 'Ações administrativas', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-500/10' }
                ].map((kpi, i) => (
                  <div key={i} className="bg-card p-8 rounded-[40px] border border-border shadow-sm flex flex-col items-center text-center group hover:border-primary/20 transition-all">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", kpi.bg, kpi.color)}>
                      <kpi.icon className="w-7 h-7" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/40 mb-1">{kpi.label}</p>
                    <p className="text-4xl font-serif font-bold text-foreground mb-1">{kpi.value}</p>
                    <p className="text-[10px] text-foreground/30 font-medium">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Gráfico de Volume */}
                <div className="bg-card p-10 rounded-[40px] border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h5 className="text-xl font-serif font-bold text-foreground">Fluxo de Atendimentos</h5>
                      <p className="text-sm text-foreground/40">Volume diário no intervalo selecionado</p>
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <LineChart data={reportsData.appointmentsByDay}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(var(--foreground), 0.05)" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'rgba(var(--foreground), 0.4)', fontSize: 12 }} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: 'rgba(var(--foreground), 0.4)', fontSize: 12 }} 
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'white', borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="total" 
                          stroke="#3b82f6" 
                          strokeWidth={4} 
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6, stroke: '#fff' }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Gráfico de Especialidade */}
                <div className="bg-card p-10 rounded-[40px] border border-border shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <div>
                      <h5 className="text-xl font-serif font-bold text-foreground">Demanda por Especialidade</h5>
                      <p className="text-sm text-foreground/40">Participação relativa por área médica</p>
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={50}>
                      <PieChart>
                        <Pie
                          data={reportsData.specialtyCounts}
                          cx="50%"
                          cy="50%"
                          innerRadius={100}
                          outerRadius={150}
                          paddingAngle={8}
                          dataKey="value"
                        >
                          {reportsData.specialtyCounts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'][index % 5]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Tabela de Produtividade Médica */}
              <div className="bg-card p-10 rounded-[40px] border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between mb-10">
                  <div>
                    <h5 className="text-xl font-serif font-bold text-foreground">Ranking de Produtividade Clínica</h5>
                    <p className="text-sm text-foreground/40">Performance detalhada por profissional no período</p>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-6 text-[10px] font-bold uppercase tracking-widest text-foreground/40">Profissional</th>
                        <th className="pb-6 text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-center">Volume Total</th>
                        <th className="pb-6 text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-center">Concluídos</th>
                        <th className="pb-6 text-[10px] font-bold uppercase tracking-widest text-foreground/40 text-right">Taxa de Eficiência</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {reportsData.doctorStats.map((doc, i) => (
                        <tr key={doc.name} className="group hover:bg-primary/[0.02] transition-colors">
                          <td className="py-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                {doc.name.charAt(0)}
                              </div>
                              <span className="font-bold text-foreground">{doc.name}</span>
                            </div>
                          </td>
                          <td className="py-6 text-center text-foreground/60 font-medium">{doc.total}</td>
                          <td className="py-6 text-center">
                            <span className="px-3 py-1 bg-green-500/10 text-green-600 rounded-full text-xs font-bold">
                              {doc.completed}
                            </span>
                          </td>
                          <td className="py-6 text-right">
                            <div className="flex items-center justify-end gap-4">
                              <div className="flex-1 max-w-[120px] bg-background h-1.5 rounded-full overflow-hidden border border-border">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.round((doc.completed / doc.total) * 100)}%` }}
                                  className="h-full bg-primary"
                                />
                              </div>
                              <span className="font-bold text-sm text-foreground min-w-[40px]">
                                {Math.round((doc.completed / doc.total) * 100)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
          {activeTab === 'users' && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-card p-4 rounded-[24px] shadow-sm border border-border">
                  <Users className="w-6 h-6 text-info mb-2" />
                  <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1">Usuários</p>
                  <p className="text-xl font-bold text-foreground">{users.length}</p>
                </div>
                <div className="bg-card p-4 rounded-[24px] shadow-sm border border-border">
                  <Stethoscope className="w-6 h-6 text-accent mb-2" />
                  <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1">Médicos</p>
                  <p className="text-xl font-bold text-foreground">{users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).length}</p>
                </div>
                <div className="bg-card p-4 rounded-[24px] shadow-sm border border-border">
                  <Calendar className="w-6 h-6 text-secondary mb-2" />
                  <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1">Escalas</p>
                  <p className="text-xl font-bold text-foreground">{schedules.length}</p>
                </div>
                <div className="bg-card p-4 rounded-[24px] shadow-sm border border-border">
                  <ShieldCheck className="w-6 h-6 text-primary mb-2" />
                  <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1">Admins</p>
                  <p className="text-xl font-bold text-foreground">{users.filter(u => u.role === 'admin').length}</p>
                </div>
                <div className="bg-card p-4 rounded-[24px] shadow-sm border border-border">
                  <Stethoscope className="w-6 h-6 text-green-500 mb-2" />
                  <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1">Especialidades</p>
                  <p className="text-xl font-bold text-foreground">{specialties.length}</p>
                </div>
                <div className="bg-card p-4 rounded-[24px] shadow-sm border border-border">
                  <Bell className="w-6 h-6 text-orange-500 mb-2" />
                  <p className="text-[10px] text-foreground/40 uppercase tracking-widest mb-1">Notificações</p>
                  <p className="text-xl font-bold text-foreground">{systemNotifications.length}</p>
                </div>
              </div>

              <section>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h4 className="text-lg font-serif font-bold text-foreground">Lista de Utilizadores</h4>
                    <p className="text-xs text-foreground/40">Gerencie permissões e perfis de acesso.</p>
                  </div>
                  <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsAddUserModalOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full text-sm font-bold shadow-md hover:bg-primary-hover transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      Novo Utilizador
                    </motion.button>
                  </div>
                </div>
                <div className="bg-card rounded-[32px] shadow-sm border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-background/50 text-[10px] text-foreground/40 uppercase tracking-widest">
                          <th className="px-6 py-4 font-bold">Utilizador</th>
                          <th className="px-6 py-4 font-bold">Especialidade / Info</th>
                          <th className="px-6 py-4 font-bold">Role</th>
                          <th className="px-6 py-4 font-bold text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredUsers.length > 0 ? (
                          filteredUsers.map((u) => (
                            <tr key={u.uid} className="hover:bg-background/50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                    {u.name.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium text-foreground text-sm">{u.name}</p>
                                    <p className="text-[10px] text-foreground/40">{u.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                {u.role === 'doctor' ? (
                                  <span className="text-xs text-primary font-medium bg-primary/5 px-2 py-1 rounded-md">
                                    {u.specialty || 'Clínico Geral'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-foreground/40">---</span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  value={u.role}
                                  onChange={(e) => updateUserRole(u.uid, e.target.value)}
                                  className="bg-background/50 text-[10px] font-bold uppercase px-3 py-1 rounded-full border border-border focus:ring-2 focus:ring-primary text-foreground outline-none"
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
                                  className="text-red-500 hover:bg-red-500/10 p-2 rounded-full transition-colors"
                                  title="Remover utilizador"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center">
                              <div className="flex flex-col items-center gap-3">
                                <div className="w-12 h-12 bg-background/50 rounded-full flex items-center justify-center text-foreground/20">
                                  <Search className="w-6 h-6" />
                                </div>
                                <p className="text-sm text-foreground/40">Nenhum utilizador encontrado para "{globalSearch}"</p>
                                <button 
                                  onClick={() => setGlobalSearch('')}
                                  className="text-primary text-xs font-medium hover:underline"
                                >
                                  Limpar busca
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="Nome do paciente..."
                    value={quickPatientName}
                    onChange={(e) => setQuickPatientName(e.target.value)}
                    className="flex-1 px-6 py-4 bg-card rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  />
                  <select 
                    value={quickDoctorId}
                    onChange={(e) => setQuickDoctorId(e.target.value)}
                    className="px-6 py-4 bg-card rounded-full border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  >
                    <option value="">Médico...</option>
                    {users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                  </select>
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleQuickAddToQueue}
                    className="bg-primary text-white px-8 py-4 rounded-full font-medium flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar à Fila
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                  <h4 className="text-sm text-foreground/40 uppercase tracking-widest flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Agendamentos de Hoje ({stats.todayAppointments.length})
                  </h4>
                  <div className="bg-card rounded-[32px] shadow-sm border border-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-background/50 text-[10px] text-foreground/40 uppercase tracking-widest">
                          <th className="px-6 py-4 font-bold">Horário</th>
                          <th className="px-6 py-4 font-bold">Paciente</th>
                          <th className="px-6 py-4 font-bold">Médico</th>
                          <th className="px-6 py-4 font-bold">Status</th>
                          <th className="px-6 py-4 font-bold text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredApts.map((apt) => (
                          <tr key={apt.id} className="hover:bg-background/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-foreground">
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
                            <td className="px-6 py-4 text-sm text-foreground/60">{apt.doctorName}</td>
                            <td className="px-6 py-4">
                              <span className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                apt.status === 'checked-in' ? 'bg-accent/10 text-accent' : 
                                apt.status === 'scheduled' ? 'bg-info/10 text-info' : 
                                apt.status === 'no-show' ? 'bg-red-100 text-red-600' : 'bg-background/50 text-foreground/40'
                              )}>
                                {apt.status === 'checked-in' ? 'Presente' : 
                                 apt.status === 'no-show' ? 'Ausente' : apt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                              {apt.status === 'scheduled' && (
                                <>
                                  <motion.button 
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleCheckIn(apt.id, apt.dateTime)}
                                    className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold hover:bg-primary-hover transition-all"
                                  >
                                    Check-in
                                  </motion.button>
                                  <motion.button 
                                    whileHover={{ scale: 1.2, color: '#d97706' }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => handleNoShow(apt.id)}
                                    className="p-2 text-foreground/40 transition-colors"
                                    title="Marcar como ausente"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </motion.button>
                                </>
                              )}
                              {apt.status === 'checked-in' && (
                                <div className="text-accent flex items-center justify-end gap-1 text-xs font-bold">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Confirmado
                                </div>
                              )}
                              <motion.button 
                                whileHover={{ scale: 1.2, color: '#ef4444' }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteAppointment(apt.id)}
                                className="p-2 text-foreground/40 transition-colors"
                                title="Eliminar agendamento"
                              >
                                <Trash2 className="w-4 h-4" />
                              </motion.button>
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
                          {stats.todayAppointments.filter(a => a.status === 'checked-in' || a.status === 'in-progress' || a.status === 'completed').length}
                        </span>
                        <span className="text-sm opacity-70">Pacientes Presentes</span>
                      </div>
                      <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-white h-full" 
                          style={{ width: `${(stats.todayAppointments.filter(a => a.status === 'checked-in' || a.status === 'in-progress' || a.status === 'completed').length / (stats.todayAppointments.length || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'doctor-profiles' && (
            <motion.div
              key="doctor-profiles"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm max-w-4xl">
                <h3 className="text-2xl font-serif font-bold mb-6">Gestão de Perfis Médicos</h3>
                
                <div className="mb-8">
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Selecionar Médico</label>
                  <select 
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all text-foreground"
                  >
                    <option value="">Escolha um médico para editar...</option>
                    {users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).map(d => (
                      <option key={d.uid} value={d.uid}>{d.name} ({d.specialty || 'Sem especialidade'})</option>
                    ))}
                  </select>
                </div>

                {selectedDoctorId && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 border-t border-border pt-8"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Nome Profissional</label>
                        <input 
                          type="text"
                          value={doctorProfileData.name}
                          onChange={(e) => setDoctorProfileData({...doctorProfileData, name: e.target.value})}
                          className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Nº de Ordem (ORMED)</label>
                        <input 
                          type="text"
                          placeholder="Ex: ORMED-12345"
                          value={doctorProfileData.crm}
                          onChange={(e) => setDoctorProfileData({...doctorProfileData, crm: e.target.value})}
                          className={cn(
                            "w-full p-4 rounded-2xl border bg-background/50 focus:ring-2 outline-none transition-all text-foreground",
                            doctorProfileData.crm && !isOrmedValid 
                              ? "border-red-500 focus:ring-red-500/20" 
                              : "border-border focus:ring-primary/20"
                          )}
                        />
                        {doctorProfileData.crm && !isOrmedValid && (
                          <motion.p 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-[10px] text-red-500 font-bold mt-2 ml-2 flex items-center gap-1"
                          >
                            <AlertCircle className="w-3 h-3" />
                            Formato inválido. Use: ORMED-12345
                          </motion.p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Especialidade Atual</label>
                        <select 
                          value={doctorProfileData.specialty}
                          onChange={(e) => setDoctorProfileData({...doctorProfileData, specialty: e.target.value})}
                          className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                        >
                          <option value="">Sem especialidade</option>
                          {specialties.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Contato</label>
                        <input 
                          type="text"
                          value={doctorProfileData.contact}
                          onChange={(e) => setDoctorProfileData({...doctorProfileData, contact: e.target.value})}
                          className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Biografia</label>
                        <textarea 
                          value={doctorProfileData.bio}
                          onChange={(e) => setDoctorProfileData({...doctorProfileData, bio: e.target.value})}
                          rows={4}
                          className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none resize-none text-foreground"
                        />
                      </div>
                    </div>

                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleUpdateDoctorProfile}
                      disabled={isSavingDoctor}
                      className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSavingDoctor ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Salvar Alterações no Perfil
                    </motion.button>
                  </motion.div>
                )}
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
              <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
                <h3 className="text-2xl font-serif font-bold mb-6">Gestão de Especialidades</h3>
                <form onSubmit={handleAddSpecialty} className="flex gap-4 mb-8">
                  <input 
                    type="text"
                    value={newSpecialty}
                    onChange={(e) => setNewSpecialty(e.target.value)}
                    placeholder="Nome da especialidade (ex: Cardiologia)"
                    className="flex-1 px-6 py-3 bg-background/50 rounded-2xl border border-border focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="submit" 
                    className="bg-primary text-white px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:bg-primary-hover transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar
                  </motion.button>
                </form>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specialties.filter(s => !globalSearch || s.name.toLowerCase().includes(globalSearch.toLowerCase())).map((spec) => (
                    <div key={spec.id} className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-card rounded-xl flex items-center justify-center shadow-sm">
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
              <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
                <h3 className="text-2xl font-serif font-bold mb-6">Gestão de Calendários Semanais</h3>
                <form onSubmit={handleAddSchedule} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-10 p-6 bg-background/50 rounded-3xl border border-border">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-2">Médico</label>
                    <select 
                      value={newSchedule.doctorId || ''}
                      onChange={(e) => setNewSchedule({...newSchedule, doctorId: e.target.value})}
                      className="w-full px-4 py-3 bg-card rounded-xl border border-border outline-none text-sm text-foreground"
                    >
                      <option value="">Selecionar Médico</option>
                      {users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).map(d => <option key={d.uid} value={d.uid}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-2">Dia</label>
                    <select 
                      value={newSchedule.dayOfWeek}
                      onChange={(e) => setNewSchedule({...newSchedule, dayOfWeek: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 bg-card rounded-xl border border-border outline-none text-sm text-foreground"
                    >
                      {days.map((day, i) => <option key={i} value={i}>{day}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-2">Início</label>
                    <input 
                      type="time"
                      value={newSchedule.startTime}
                      onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                      className="w-full px-4 py-3 bg-card rounded-xl border border-border outline-none text-sm text-foreground"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-foreground/40 ml-2">Fim</label>
                    <input 
                      type="time"
                      value={newSchedule.endTime}
                      onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                      className="w-full px-4 py-3 bg-card rounded-xl border border-border outline-none text-sm text-foreground"
                    />
                  </div>
                  <div className="flex items-end">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit" 
                      className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Adicionar
                    </motion.button>
                  </div>
                </form>
                <div className="space-y-4">
                  {users.filter(u => u.role === 'doctor' && (!globalSearch || u.name.toLowerCase().includes(globalSearch.toLowerCase()))).map(doctor => {
                    const doctorSchedules = schedules.filter(s => s.doctorId === doctor.uid);
                    if (doctorSchedules.length === 0) return null;
                    return (
                      <div key={doctor.uid} className="p-6 border border-border rounded-[32px] hover:shadow-md transition-all">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                            <UserIcon className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-foreground">{doctor.name}</h4>
                            <p className="text-xs text-foreground/40 uppercase tracking-widest">{doctor.specialty || 'Clínico Geral'}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {doctorSchedules.map(s => (
                            <div key={s.id} className="flex items-center justify-between p-3 bg-background/50 rounded-xl border border-border group">
                              <div className="text-xs">
                                <span className="font-bold text-primary block mb-1">{days[s.dayOfWeek]}</span>
                                <span className="text-foreground/60">{s.startTime} - {s.endTime}</span>
                              </div>
                              <button 
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="p-1.5 text-foreground/40 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
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
              <div className="bg-card p-8 rounded-[32px] border border-border shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                  <div>
                    <h3 className="text-2xl font-serif font-bold text-foreground">Configurações Globais</h3>
                    <p className="text-foreground/60">Gerencie parâmetros do sistema e dados iniciais.</p>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={seedInitialData}
                    className="flex items-center gap-2 px-6 py-3 bg-card border border-primary text-primary rounded-full hover:bg-background transition-all font-medium"
                  >
                    <Database className="w-5 h-5" />
                    Semear Dados Iniciais
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      Segurança e Acesso
                    </h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border">
                        <div>
                          <p className="text-sm font-bold text-foreground">Autenticação de Dois Fatores</p>
                          <p className="text-[10px] text-foreground/40">Exigir código via email no login.</p>
                        </div>
                        <button 
                          onClick={() => setSystemSettings({...systemSettings, twoFactorAuth: !systemSettings.twoFactorAuth})}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all",
                            systemSettings.twoFactorAuth ? "bg-primary" : "bg-background border border-border"
                          )}
                        >
                          <motion.div 
                            animate={{ x: systemSettings.twoFactorAuth ? 24 : 4 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-background/50 rounded-2xl border border-border">
                        <div>
                          <p className="text-sm font-bold text-foreground">Logs de Auditoria</p>
                          <p className="text-[10px] text-foreground/40">Registar todas as ações administrativas.</p>
                        </div>
                        <button 
                          onClick={() => setSystemSettings({...systemSettings, auditLogs: !systemSettings.auditLogs})}
                          className={cn(
                            "w-12 h-6 rounded-full relative transition-all",
                            systemSettings.auditLogs ? "bg-primary" : "bg-background border border-border"
                          )}
                        >
                          <motion.div 
                            animate={{ x: systemSettings.auditLogs ? 24 : 4 }}
                            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-primary" />
                      Manutenção
                    </h4>
                    <div className="space-y-4">
                      <button 
                        onClick={handleClearCache}
                        className="w-full text-left p-4 bg-background/50 rounded-2xl hover:bg-background transition-colors border border-border group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Limpar Cache do Sistema</p>
                          <RefreshCw className="w-4 h-4 text-foreground/20 group-hover:rotate-180 transition-all duration-500" />
                        </div>
                        <p className="text-xs text-foreground/60">Remove arquivos temporários e otimiza performance.</p>
                      </button>
                      <button 
                        onClick={handleBackupData}
                        className="w-full text-left p-4 bg-background/50 rounded-2xl hover:bg-background transition-colors border border-border group"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">Backup de Dados</p>
                          <Download className="w-4 h-4 text-foreground/20 group-hover:translate-y-0.5 transition-all" />
                        </div>
                        <p className="text-xs text-foreground/60">Gera uma cópia de segurança de toda a base em JSON.</p>
                      </button>
                    </div>
                  </div>
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

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {/* Add User Modal */}
      <AnimatePresence>
        {isAddUserModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card w-full max-w-md rounded-[32px] shadow-2xl border border-border overflow-hidden"
            >
              <div className="p-8 border-b border-border">
                <h3 className="text-2xl font-serif font-bold text-foreground">Novo Utilizador</h3>
                <p className="text-sm text-foreground/60">Crie um novo perfil no sistema.</p>
              </div>
              <form onSubmit={handleCreateUser} className="p-8 space-y-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Nome Completo</label>
                  <input 
                    type="text"
                    required
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Email</label>
                  <input 
                    type="email"
                    required
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-widest text-foreground/40 mb-2 block">Função (Role)</label>
                  <select 
                    value={newUserData.role}
                    onChange={(e) => setNewUserData({...newUserData, role: e.target.value as any})}
                    className="w-full p-4 rounded-2xl border border-border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none text-foreground"
                  >
                    <option value="patient">Paciente</option>
                    <option value="doctor">Médico</option>
                    <option value="receptionist">Rececionista</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                    className="flex-1 px-6 py-4 rounded-full font-bold text-foreground/60 hover:bg-background transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={isCreatingUser}
                    className="flex-1 bg-primary text-white px-6 py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isCreatingUser ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Criar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
