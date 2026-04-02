import { motion } from 'motion/react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { toast } from 'sonner';
import React from 'react';
import PublicLayout from '../components/PublicLayout';

export default function Contact() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Mensagem enviada com sucesso! Entraremos em contato em breve.');
  };

  return (
    <PublicLayout>
      <main className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-5xl font-serif font-bold text-foreground mb-6">Entre em Contato</h1>
            <p className="text-lg text-gray-600 mb-12">
              Tem alguma dúvida sobre o sistema ou deseja implementar o SAI no seu hospital? Nossa equipe está pronta para ajudar.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary shrink-0">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Email</h4>
                  <p className="text-gray-500">contato@sai-saude.com.br</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary shrink-0">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Telefone</h4>
                  <p className="text-gray-500">+55 (11) 4002-8922</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary shrink-0">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-foreground">Endereço</h4>
                  <p className="text-gray-500">Av. Paulista, 1000 - Bela Vista, São Paulo - SP</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-10 rounded-[40px] shadow-xl border border-gray-100"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Nome</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Seu nome" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Email</label>
                  <input type="email" required className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="seu@email.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Assunto</label>
                <input type="text" required className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Como podemos ajudar?" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Mensagem</label>
                <textarea required rows={4} className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary/20 outline-none resize-none" placeholder="Sua mensagem..."></textarea>
              </div>
              <button type="submit" className="w-full bg-primary text-white py-4 rounded-full font-bold shadow-lg hover:bg-primary-hover transition-all flex items-center justify-center gap-2">
                <Send className="w-5 h-5" />
                Enviar Mensagem
              </button>
            </form>
          </motion.div>
        </div>
      </main>
    </PublicLayout>
  );
}
