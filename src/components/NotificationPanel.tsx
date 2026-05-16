import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, AlertCircle, CheckCircle2, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Notification } from '../types';
import { cn } from '../lib/utils';

interface NotificationPanelProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ 
  notifications, 
  unreadCount, 
  onMarkAsRead, 
  onMarkAllAsRead,
  onDelete,
  isOpen,
  onClose
}) => {
  return (
    <div className="relative">
      <motion.button 
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClose}
        className="relative p-3 bg-background/50 rounded-2xl text-foreground/40 hover:text-primary hover:bg-primary/10 transition-all border border-border"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-card rounded-full"></span>
        )}
      </motion.button>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={onClose} />
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 bg-card rounded-[24px] shadow-2xl border border-border p-5 z-50 overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 px-1">
                <div className="flex items-center gap-2">
                  <h5 className="text-xs font-bold uppercase tracking-widest text-foreground/40">Notificações</h5>
                  {unreadCount > 0 && (
                    <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={onMarkAllAsRead} 
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:underline"
                  >
                    Lidas
                  </button>
                  <button 
                    onClick={onClose}
                    className="p-1 hover:bg-background rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-foreground/40" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    className={cn(
                      "group relative p-4 rounded-2xl text-xs flex gap-3 items-start border transition-all",
                      n.read ? "bg-background/30 border-border/50 text-foreground/60" : "bg-primary/5 border-primary/10 text-foreground font-medium"
                    )}
                  >
                    <div 
                      onClick={() => onMarkAsRead(n.id)}
                      className="flex-1 flex gap-3 cursor-pointer"
                    >
                      <div className={cn(
                        "p-2 rounded-lg shrink-0",
                        n.type === 'alert' ? "bg-red-500/10 text-red-500" : 
                        n.type === 'success' ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {n.type === 'alert' ? <AlertCircle className="w-3.5 h-3.5" /> : 
                         n.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold mb-0.5 truncate">{n.title}</p>
                        <p className="text-[10px] leading-relaxed opacity-80 line-clamp-2">{n.message}</p>
                        <p className="text-[9px] mt-2 opacity-40 font-medium">
                          {format(new Date(n.time), 'HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(n.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-foreground/20 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                
                {notifications.length === 0 && (
                  <div className="py-12 text-center space-y-3">
                    <div className="w-12 h-12 bg-background rounded-2xl flex items-center justify-center mx-auto text-foreground/10">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-foreground/40 italic text-xs">Sem notificações no momento.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
