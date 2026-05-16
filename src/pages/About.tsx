import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Target, Shield, Zap } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

export default function About() {
  return (
    <PublicLayout>
      <main className="max-w-4xl mx-auto px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-8">Nossa Missão</h1>
          
          <div className="prose prose-lg text-foreground/70 leading-relaxed space-y-6">
            <p className="text-xl font-serif italic text-primary">
              "Transformar a experiência de saúde através da tecnologia, tornando o atendimento hospitalar mais humano, eficiente e transparente."
            </p>
            
            <p>
              O <strong>Sistema de Agendamento Inteligente (SAI)</strong> nasceu da necessidade de resolver um dos maiores gargalos do sistema de saúde: a gestão ineficiente de filas e agendamentos. Acreditamos que o tempo do paciente e do profissional de saúde é precioso.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
              {[
                { icon: Target, title: "Objetivo", description: "Eliminar tempos de espera desnecessários através de algoritmos de fila dinâmica." },
                { icon: Shield, title: "Segurança", description: "Garantir a privacidade e integridade dos dados sensíveis de cada paciente." },
                { icon: Zap, title: "Agilidade", description: "Simplificar processos burocráticos desde o check-in até a finalização da consulta." }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-4"
                >
                  <div className="w-12 h-12 bg-card rounded-2xl shadow-sm border border-border flex items-center justify-center text-primary">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-serif font-bold text-xl text-foreground">{item.title}</h3>
                  <p className="text-sm">{item.description}</p>
                </motion.div>
              ))}
            </div>

            <h2 className="text-3xl font-serif font-bold text-foreground pt-8">Como Funciona?</h2>
            <p>
              O SAI integra três frentes principais:
            </p>
            <ul className="list-disc pl-6 space-y-4">
              <li>
                <strong>Para o Paciente:</strong> Uma interface clara para agendar, cancelar e acompanhar sua posição na fila em tempo real.
              </li>
              <li>
                <strong>Para a Recepção:</strong> Ferramentas de check-in rápido e gestão de fluxo que alimentam automaticamente a fila dos médicos.
              </li>
              <li>
                <strong>Para o Médico:</strong> Um painel focado no atendimento, com informações precisas sobre o próximo paciente e métricas de produtividade.
              </li>
            </ul>

            <div className="bg-card p-10 rounded-[40px] shadow-sm border border-border mt-16">
              <h3 className="text-2xl font-serif font-bold text-foreground mb-4">Compromisso com a Excelência</h3>
              <p className="text-sm text-foreground/60">
                Desenvolvido com as tecnologias mais modernas de desenvolvimento web e nuvem, o SAI é uma solução escalável preparada para atender desde pequenas clínicas até grandes complexos hospitalares.
              </p>
              <Link 
                to="/login"
                className="inline-block mt-8 bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-hover transition-all"
              >
                Experimente o Sistema
              </Link>
            </div>
          </div>
        </motion.div>
      </main>
    </PublicLayout>
  );
}
