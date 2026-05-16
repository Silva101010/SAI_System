import React from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Stat {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface DashboardStatsProps {
  stats: Stat[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="bg-card p-6 md:p-8 rounded-3xl border border-border shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
          <div className={cn(
            "w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-4 md:mb-5 transition-transform group-hover:scale-110", 
            stat.bg, 
            stat.color
          )}>
            <stat.icon className="w-6 h-6 md:w-7 md:h-7 opacity-80" />
          </div>
          <p className="text-2xl md:text-3xl font-serif font-bold text-foreground tracking-tight">
            {stat.value}
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/60 mt-2">{stat.label}</p>
        </motion.div>
      ))}
    </div>
  );
};
