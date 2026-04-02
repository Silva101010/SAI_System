import { motion } from 'motion/react';
import { Search, Calendar, CheckCircle, Smartphone, Clock, ShieldCheck } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

export default function HowItWorks() {
  const steps = [
    {
      title: "Busca e Agendamento",
      description: "O paciente escolhe a especialidade e o profissional de sua preferência através do nosso portal intuitivo.",
      icon: Search,
      color: "bg-info/10 text-info"
    },
    {
      title: "Confirmação Inteligente",
      description: "O sistema valida a disponibilidade em tempo real e envia uma confirmação instantânea via e-mail e SMS.",
      icon: Calendar,
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Check-in via QR Code",
      description: "Ao chegar na clínica, o paciente realiza o check-in escaneando um QR Code, sem precisar passar pela recepção.",
      icon: Smartphone,
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Fila Dinâmica",
      description: "Nosso algoritmo organiza a ordem de atendimento baseada no horário agendado e na prioridade clínica.",
      icon: Clock,
      color: "bg-secondary/10 text-secondary"
    },
    {
      title: "Atendimento Focado",
      description: "O médico recebe todas as informações necessárias e o status do paciente, otimizando o tempo de consulta.",
      icon: ShieldCheck,
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Feedback e Histórico",
      description: "Após a consulta, o paciente avalia o atendimento e tem acesso ao seu histórico médico de forma segura.",
      icon: CheckCircle,
      color: "bg-info/10 text-info"
    }
  ];

  return (
    <PublicLayout>
      <section className="py-24 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-widest mb-6"
            >
              Processo Otimizado
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6"
            >
              Como o SAI Funciona?
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
            >
              Entenda como nossa tecnologia conecta pacientes e médicos de forma eficiente, reduzindo burocracias e tempos de espera.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative p-10 bg-white rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
              >
                <div className="absolute -top-6 -left-6 w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center font-serif font-bold text-xl shadow-lg z-10">
                  {index + 1}
                </div>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${step.color}`}>
                  <step.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-4">{step.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="mt-24 p-12 bg-primary rounded-[48px] text-white text-center relative overflow-hidden"
          >
            <div className="relative z-10">
              <h2 className="text-4xl font-serif font-bold mb-6">Pronto para transformar sua clínica?</h2>
              <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto">
                Junte-se a centenas de instituições que já utilizam o SAI para oferecer um atendimento de excelência.
              </p>
              <button className="bg-white text-primary px-12 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-xl">
                Agende uma Demonstração
              </button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
