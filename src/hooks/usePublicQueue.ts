import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format } from 'date-fns';

export interface PublicQueueEntry {
  id: string;
  doctorId: string;
  status: string;
  dateTime: string;
  checkInTime?: string;
  priority?: number;
  day: string;
}

export function usePublicQueue(doctorId?: string, date?: Date) {
  const [queue, setQueue] = useState<PublicQueueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!doctorId || !date) return;

    const day = format(date, 'yyyy-MM-dd');
    const q = query(
      collection(db, 'public_queue'),
      where('doctorId', '==', doctorId),
      where('day', '==', day)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PublicQueueEntry));
      setQueue(docs);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching public queue:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [doctorId, date]);

  return { queue, loading };
}
