import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Calendar, Clock, ShieldCheck, Users, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import PublicLayout from '../components/PublicLayout';
import { cn } from '../lib/utils';

export default function LandingPage() {
  const { user, profile } = useAuth();

  const features = [
    {
      title: "Fila Dinâmica Inteligente",
      description: "Otimização automática da ordem de atendimento baseada em check-in e prioridade.",
      icon: Clock,
      color: "bg-amber-50 text-amber-600"
    },
    {
      title: "Check-in via QR Code",
      description: "Redução de filas na recepção com confirmação de presença instantânea.",
      icon: ShieldCheck,
      color: "bg-green-50 text-green-600"
    },
    {
      title: "Gestão de Escalas",
      description: "Controle total sobre a disponibilidade dos médicos e horários de consulta.",
      icon: Calendar,
      color: "bg-blue-50 text-blue-600"
    },
    {
      title: "Painel do Paciente",
      description: "Acompanhamento em tempo real do status da consulta e histórico médico.",
      icon: Users,
      color: "bg-purple-50 text-purple-600"
    }
  ];

  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="pb-20 px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-6">
              Inovação em Saúde
            </span>
            <h1 className="text-6xl md:text-7xl font-serif font-bold text-foreground leading-[1.1] mb-6">
              Gestão Hospitalar <br /> 
              <span className="italic font-light text-secondary">Redefinida.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-10 leading-relaxed max-w-lg">
              O Sistema de Agendamento Inteligente (SAI) otimiza o fluxo de pacientes, reduz tempos de espera e melhora a experiência clínica para todos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                to="/login"
                className="bg-primary text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-primary-hover transition-all shadow-xl flex items-center justify-center gap-2"
              >
                Começar Agora <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/como-funciona"
                className="bg-white text-primary border border-primary/20 px-10 py-4 rounded-full text-lg font-bold hover:bg-gray-50 transition-all flex items-center justify-center"
              >
                Saiba Mais
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-square bg-primary/5 rounded-[64px] absolute -top-10 -right-10 w-full h-full -z-10"></div>
            <img 
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1000" 
              alt="Hospital Moderno"
              className="rounded-[48px] shadow-2xl object-cover w-full h-[600px]"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-[32px] shadow-xl border border-gray-100 max-w-[240px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-3 h-3 bg-accent rounded-full animate-pulse"></div>
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500">Fila Ativa</span>
              </div>
              <p className="text-2xl font-serif font-bold text-foreground">98%</p>
              <p className="text-xs text-gray-500">Taxa de satisfação dos pacientes no último mês.</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-white px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-serif font-bold text-foreground mb-4">Funcionalidades Inteligentes</h2>
            <p className="text-gray-500 max-w-2xl mx-auto">
              Desenvolvemos ferramentas específicas para cada etapa do atendimento médico, garantindo eficiência e transparência.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-[32px] border border-gray-100 hover:border-primary/20 hover:shadow-xl transition-all group"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110", feature.color)}>
                  <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-serif font-bold text-foreground mb-3">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 px-8 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-serif font-bold text-foreground mb-12">Por que escolher o SAI?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-left">
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
              <div>
                <h4 className="font-bold text-foreground mb-1">Redução de Espera</h4>
                <p className="text-sm text-gray-500">Diminuímos em média 40% o tempo de permanência na sala de espera.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
              <div>
                <h4 className="font-bold text-foreground mb-1">Dados em Tempo Real</h4>
                <p className="text-sm text-gray-500">Médicos e gestores têm acesso a métricas precisas de atendimento.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-accent shrink-0" />
              <div>
                <h4 className="font-bold text-foreground mb-1">Fácil Integração</h4>
                <p className="text-sm text-gray-500">Interface amigável que requer treinamento mínimo para a equipe.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 text-info shrink-0" />
              <div>
                <h4 className="font-bold text-foreground mb-1">Foco no Paciente</h4>
                <p className="text-sm text-gray-500">Toda a jornada é pensada para reduzir o estresse do atendimento.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
