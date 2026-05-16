import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, startAt, endAt, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Appointment } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { startOfDay, endOfDay } from 'date-fns';

export function useDoctorAppointments(doctorId?: string, date?: Date) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId || !date) return;

    const path = 'appointments';
    const start = startOfDay(date).toISOString();
    const end = endOfDay(date).toISOString();

    const q = query(
      collection(db, path),
      where('doctorId', '==', doctorId),
      where('dateTime', '>=', start),
      where('dateTime', '<=', end),
      orderBy('dateTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Appointment));
      setAppointments(docs);
      setLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      console.error('Error fetching doctor appointments:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doctorId, date]);

  return { appointments, loading };
}
