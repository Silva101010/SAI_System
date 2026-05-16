import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Notification } from '../types';

export const createNotification = async (notif: Omit<Notification, 'id' | 'time' | 'read'>) => {
  try {
    await addDoc(collection(db, 'notifications'), {
      ...notif,
      time: new Date().toISOString(),
      read: false
    });
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const notifyAppointmentCreated = async (appointment: any) => {
  // Notify Doctor
  await createNotification({
    userId: appointment.doctorId,
    title: 'Novo Agendamento',
    message: `Você tem uma nova consulta com ${appointment.patientName} em ${new Date(appointment.dateTime).toLocaleString()}.`,
    type: 'info'
  });

  // Notify Patient
  await createNotification({
    userId: appointment.patientId,
    title: 'Agendamento Confirmado',
    message: `Sua consulta com Dr. ${appointment.doctorName} foi agendada para ${new Date(appointment.dateTime).toLocaleString()}.`,
    type: 'success'
  });
};

export const notifyAppointmentStatusChanged = async (appointment: any, newStatus: string) => {
  const statusLabels: Record<string, string> = {
    'checked-in': 'Check-in realizado',
    'in-progress': 'Em atendimento',
    'completed': 'Atendimento concluído',
    'cancelled': 'Agendamento cancelado',
    'no-show': 'Paciente não compareceu'
  };

  const label = statusLabels[newStatus] || newStatus;

  // Notify Patient
  await createNotification({
    userId: appointment.patientId,
    title: 'Status do Agendamento Atualizado',
    message: `O status da sua consulta com Dr. ${appointment.doctorName} foi alterado para: ${label}.`,
    type: newStatus === 'cancelled' || newStatus === 'no-show' ? 'alert' : 'info'
  });

  // If checked-in, notify doctor
  if (newStatus === 'checked-in') {
    await createNotification({
      userId: appointment.doctorId,
      title: 'Paciente em Espera',
      message: `O paciente ${appointment.patientName} realizou o check-in e já está aguardando na fila para a consulta das ${new Date(appointment.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      type: 'success'
    });
  }
};
