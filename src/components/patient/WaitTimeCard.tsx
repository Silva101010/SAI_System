import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { Appointment } from '../../types';
import { usePublicQueue } from '../../hooks/usePublicQueue';
import { useSchedules } from '../../hooks/useSchedules';
import { parseISO, getDay } from 'date-fns';

interface WaitTimeCardProps {
  appointment: Appointment;
}

export const WaitTimeCard: React.FC<WaitTimeCardProps> = ({ appointment }) => {
  const { queue } = usePublicQueue(appointment.doctorId, parseISO(appointment.dateTime));
  const { schedules } = useSchedules(appointment.doctorId);

  const waitInfo = useMemo(() => {
    if (queue.length === 0) return { ahead: 0, time: 0 };

    const sortedQueue = [...queue].sort((a, b) => {
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

    const myIndex = sortedQueue.findIndex(q => q.id === appointment.id);
    if (myIndex === -1) return { ahead: 0, time: 0 };

    // Count how many are strictly ahead and not completed/cancelled
    const ahead = sortedQueue.slice(0, myIndex).filter(q => 
      ['checked-in', 'in-progress'].includes(q.status)
    ).length;

    // Get slot duration for average time
    const dayOfWeek = getDay(parseISO(appointment.dateTime));
    const schedule = schedules.find(s => s.dayOfWeek === dayOfWeek);
    const avgTime = schedule?.slotDuration || 15;

    return {
      ahead,
      time: ahead * avgTime
    };
  }, [queue, appointment.id, appointment.dateTime, schedules]);

  return (
    <motion.div 
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-linear-to-br from-primary to-primary/90 text-white p-6 md:p-8 rounded-[40px] shadow-xl shadow-primary/20 flex flex-col sm:flex-row items-center justify-between gap-6"
    >
      <div className="flex items-center gap-4 md:gap-6">
        <div className="w-14 h-14 md:w-16 md:h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20">
          <Clock className="w-7 h-7 md:w-8 md:h-8" />
        </div>
        <div>
          <h5 className="text-xl font-bold">Check-in Realizado!</h5>
          <p className="text-white/80">
            Faltam aproximadamente <span className="font-bold text-white">{waitInfo.ahead} {waitInfo.ahead === 1 ? 'paciente' : 'pacientes'}</span> antes de si.
          </p>
        </div>
      </div>
      <div className="text-center sm:text-right bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10 w-full sm:w-auto">
        <p className="text-[10px] uppercase tracking-widest opacity-60 font-bold mb-1">Tempo Estimado</p>
        <p className="text-3xl font-serif font-bold">{waitInfo.time} min</p>
      </div>
    </motion.div>
  );
};
