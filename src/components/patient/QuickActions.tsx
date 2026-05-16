import React from 'react';
import { motion } from 'motion/react';
import { Plus, RefreshCw, CheckCircle2, XCircle, ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface QuickActionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  isMain?: boolean;
}

const QuickAction: React.FC<QuickActionProps> = ({ title, description, icon: Icon, onClick, variant = 'secondary', isMain }) => {
  const variants = {
    primary: "bg-linear-to-br from-primary to-primary/80 text-white shadow-primary/20",
    secondary: "bg-card border-border text-foreground hover:bg-background",
    success: "bg-card border-border text-foreground hover:bg-background",
    danger: "bg-card border-border text-foreground hover:bg-background",
  };

  const iconColors = {
    primary: "bg-white/20 text-white",
    secondary: "bg-blue-500/10 text-blue-500",
    success: "bg-green-500/10 text-green-500",
    danger: "bg-red-500/10 text-red-500",
  };

  if (isMain) {
    return (
      <motion.button 
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={cn(
          "p-8 rounded-[40px] shadow-xl flex flex-col items-start gap-6 text-left group relative overflow-hidden transition-all duration-300 w-full",
          variants.primary
        )}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-500" />
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 backdrop-blur-md border border-white/20">
          <Icon className="w-8 h-8" />
        </div>
        <div className="relative z-10">
          <p className="font-serif font-bold text-2xl mb-1">{title}</p>
          <p className="text-sm text-white/70 leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/60 mt-2">
          <span>Começar agora</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
        </div>
      </motion.button>
    );
  }

  return (
    <motion.button 
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-6 rounded-[32px] border shadow-sm flex flex-col items-start gap-4 text-left group w-full transition-all duration-300",
        variants[variant]
      )}
    >
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", iconColors[variant])}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="font-bold text-lg">{title}</p>
        <p className="text-sm opacity-60">{description}</p>
      </div>
      <ArrowRight className="w-5 h-5 ml-auto opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </motion.button>
  );
};

interface QuickActionsProps {
  onNew: () => void;
  onReschedule: () => void;
  onCheckIn: () => void;
  onCancel: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ onNew, onReschedule, onCheckIn, onCancel }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      <QuickAction 
        isMain
        title="Agendar Consulta"
        description="Escolha a especialidade, o médico e o horário ideal para si."
        icon={Plus}
        onClick={onNew}
        variant="primary"
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
        <QuickAction 
          title="Reagendar"
          description="Alterar data ou hora."
          icon={RefreshCw}
          onClick={onReschedule}
          variant="secondary"
        />
        <QuickAction 
          title="Check-in Digital"
          description="Confirme sua presença."
          icon={CheckCircle2}
          onClick={onCheckIn}
          variant="success"
        />
        <QuickAction 
          title="Cancelar"
          description="Desmarcar consulta."
          icon={XCircle}
          onClick={onCancel}
          variant="danger"
        />
      </div>
    </div>
  );
};
