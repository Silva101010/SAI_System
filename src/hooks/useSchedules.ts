import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { DoctorSchedule } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';

export function useSchedules(doctorId?: string) {
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = 'schedules';
    let q = query(collection(db, path));

    if (doctorId) {
      q = query(collection(db, path), where('doctorId', '==', doctorId));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DoctorSchedule));
      setSchedules(docs);
      setLoading(false);
    }, (error) => {
      if (error.code === 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, path);
      }
      console.error('Error fetching schedules:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doctorId]);

  return { schedules, loading };
}
