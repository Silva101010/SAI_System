import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment, AppointmentStatus } from '../types';
import { toast } from 'sonner';
import { handleFirestoreError, OperationType, triggerSyncIndicator } from '../lib/utils';
import { notifyAppointmentCreated, notifyAppointmentStatusChanged } from '../services/notificationService';
import { format, parseISO } from 'date-fns';

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

  const syncPublicQueue = async (id: string, data: Partial<Appointment>) => {
    try {
      if (data.status === 'cancelled' || data.status === 'no-show' || data.status === 'completed') {
        await deleteDoc(doc(db, 'public_queue', id));
        return;
      }

      const updateData: any = { ...data };
      
      // Ensure we have required fields for public_queue
      if (!updateData.doctorId || !updateData.dateTime || !updateData.status) {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'appointments', id));
        if (docSnap.exists()) {
          const fullData = docSnap.data() as Appointment;
          updateData.doctorId = updateData.doctorId || fullData.doctorId;
          updateData.dateTime = updateData.dateTime || fullData.dateTime;
          updateData.status = updateData.status || fullData.status;
          updateData.priority = updateData.priority !== undefined ? updateData.priority : (fullData.priority || 0);
          updateData.checkInTime = updateData.checkInTime || fullData.checkInTime;
        }
      }

      if (updateData.dateTime) {
        updateData.day = format(parseISO(updateData.dateTime), 'yyyy-MM-dd');
      }

      // Clean up data for public_queue (only allowed fields)
      const publicData = {
        doctorId: updateData.doctorId,
        status: updateData.status,
        dateTime: updateData.dateTime,
        day: updateData.day,
        checkInTime: updateData.checkInTime || null,
        priority: updateData.priority || 0
      };

      if (publicData.doctorId && publicData.status && publicData.dateTime && publicData.day) {
        await setDoc(doc(db, 'public_queue', id), publicData, { merge: true });
      }
    } catch (error) {
      console.error('Error syncing public queue:', error);
    }
  };

  const createAppointment = async (data: Omit<Appointment, 'id'>) => {
    const path = 'appointments';
    try {
      const docRef = await addDoc(collection(db, path), data);
      await syncPublicQueue(docRef.id, data);
      await notifyAppointmentCreated({ id: docRef.id, ...data });
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
    triggerSyncIndicator();
    try {
      let appointment = appointments.find(a => a.id === id);
      
      // If not in local state, fetch it to ensure notifications can be sent
      if (!appointment) {
        const { getDoc } = await import('firebase/firestore');
        const docSnap = await getDoc(doc(db, 'appointments', id));
        if (docSnap.exists()) {
          appointment = { id: docSnap.id, ...docSnap.data() } as Appointment;
        }
      }

      const updateData: any = { status };
      if (status === 'checked-in') {
        updateData.checkInTime = new Date().toISOString();
      }
      await updateDoc(doc(db, 'appointments', id), updateData);
      await syncPublicQueue(id, updateData);
      
      if (appointment) {
        await notifyAppointmentStatusChanged(appointment, status);
      }
      
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
      await deleteDoc(doc(db, 'public_queue', id));
      toast.success('Agendamento eliminado com sucesso!');
    } catch (error: any) {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.DELETE, path);
      }
      console.error('Error deleting appointment:', error);
      toast.error('Erro ao eliminar agendamento.');
    }
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    const path = `appointments/${id}`;
    triggerSyncIndicator();
    const promise = updateDoc(doc(db, 'appointments', id), data);
    
    promise.then(() => syncPublicQueue(id, data));

    toast.promise(promise, {
      loading: 'A atualizar agendamento...',
      success: 'Agendamento atualizado com sucesso!',
      error: (err) => {
        if (err.code === 'permission-denied') {
          handleFirestoreError(err, OperationType.UPDATE, path);
        }
        return 'Erro ao atualizar agendamento.';
      }
    });
    
    return promise;
  };

  return { appointments, loading, createAppointment, updateAppointmentStatus, deleteAppointment, updateAppointment, syncPublicQueue };
}
