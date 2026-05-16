import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Stethoscope, CheckCircle2, XCircle, MoreHorizontal, Calendar } from 'lucide-react';
import { Appointment, AppointmentStatus } from '../../types';
import { cn } from '../../lib/utils';

interface AppointmentTableProps {
  appointments: Appointment[];
  onStatusUpdate: (id: string, status: AppointmentStatus) => void;
  title: string;
  emptyMessage: string;
}

export const AppointmentTable: React.FC<AppointmentTableProps> = ({ appointments, onStatusUpdate, title, emptyMessage }) => {
  const getStatusColor = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'checked-in': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'in-progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'completed': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'no-show': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse';
      default: return 'bg-background/50 text-foreground/70 border-border';
    }
  };

  const getStatusLabel = (status: AppointmentStatus) => {
    switch (status) {
      case 'scheduled': return 'Confirmado';
      case 'checked-in': return 'Presente';
      case 'in-progress': return 'Em Consulta';
      case 'completed': return 'Concluído';
      case 'cancelled': return 'Cancelado';
      case 'no-show': return 'Ausente';
      case 'pending': return 'Pendente';
      default: return status;
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-serif font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          {title}
        </h4>
      </div>

      <div className="bg-card rounded-[32px] shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-background/50 text-[10px] text-foreground/40 uppercase tracking-[0.2em]">
                <th className="px-6 py-4 font-bold">Data / Hora</th>
                <th className="px-6 py-4 font-bold">Médico</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4 font-bold text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.length > 0 ? appointments.map((apt) => (
                <tr key={apt.id} className="group hover:bg-background/50 transition-all">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">{format(parseISO(apt.dateTime), "dd/MM/yyyy")}</span>
                      <span className="text-xs text-foreground/60">{format(parseISO(apt.dateTime), "HH:mm")}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/5 rounded-full flex items-center justify-center text-primary">
                        <Stethoscope className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{apt.doctorName}</span>
                        <span className="text-[10px] text-foreground/40 uppercase tracking-wider">Especialista</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase border", getStatusColor(apt.status))}>
                      {getStatusLabel(apt.status)}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      {apt.status === 'scheduled' && (
                        <>
                          <button 
                            onClick={() => onStatusUpdate(apt.id, 'checked-in')}
                            className="p-2 text-green-600 hover:bg-green-500/10 rounded-full transition-colors"
                            title="Check-in Digital"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => onStatusUpdate(apt.id, 'cancelled')}
                            className="p-2 text-red-600 hover:bg-red-500/10 rounded-full transition-colors"
                            title="Cancelar"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      <button className="p-2 text-foreground/40 hover:bg-background rounded-full transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-foreground/40 italic">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
