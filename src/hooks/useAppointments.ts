import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment, AppointmentStatus } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType } from '../lib/utils';

export function useAppointments(userId?: string, role?: string) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !role) return;

    const path = 'appointments';
    let q = query(collection(db, path), orderBy('dateTime', 'asc'));

    if (role === 'patient') {
      q = query(collection(db, path), where('patientId', '==', userId), orderBy('dateTime', 'asc'));
    } else if (role === 'doctor') {
      q = query(collection(db, path), where('doctorId', '==', userId), orderBy('dateTime', 'asc'));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          patientId: data.patientId || '',
          patientName: data.patientName || 'Paciente',
          doctorId: data.doctorId || '',
          doctorName: data.doctorName || 'Médico',
          dateTime: data.dateTime || new Date().toISOString(),
          status: data.status || 'scheduled',
          ...data
        } as Appointment;
      });
      setAppointments(docs);
      setLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      console.error('Error fetching appointments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId, role]);

  const createAppointment = async (data: Omit<Appointment, 'id'>) => {
    const path = 'appointments';
    try {
      await addDoc(collection(db, path), data);
      toast.success('Agendamento realizado com sucesso!');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.CREATE, path);
      }
      console.error('Error creating appointment:', error);
      toast.error('Erro ao realizar agendamento.');
    }
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    const path = `appointments/${id}`;
    try {
      const updateData: any = { status };
      if (status === 'checked-in') {
        updateData.checkInTime = new Date().toISOString();
      }
      await updateDoc(doc(db, 'appointments', id), updateData);
      toast.success(`Status atualizado para ${status}`);
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status.');
    }
  };

  const deleteAppointment = async (id: string) => {
    const path = `appointments/${id}`;
    try {
      await deleteDoc(doc(db, 'appointments', id));
      toast.success('Agendamento eliminado com sucesso!');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao eliminar agendamento.');
    }
  };

  return { appointments, loading, createAppointment, updateAppointmentStatus, deleteAppointment };
}
