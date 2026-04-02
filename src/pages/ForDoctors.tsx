import { motion } from 'motion/react';
import { LayoutDashboard, Calendar, Users, BarChart3, ShieldCheck, Zap } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

export default function ForDoctors() {
  const tools = [
    {
      title: "Painel de Atendimento",
      description: "Uma interface focada no que importa: o paciente. Informações claras e acesso rápido ao histórico.",
      icon: LayoutDashboard,
      color: "bg-info/10 text-info"
    },
    {
      title: "Gestão de Agenda",
      description: "Controle total sobre seus horários, bloqueios e disponibilidade em tempo real.",
      icon: Calendar,
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Fila Inteligente",
      description: "Saiba exatamente quem é o próximo e receba alertas automáticos de check-in.",
      icon: Users,
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Métricas de Performance",
      description: "Acompanhe sua produtividade, tempo médio de consulta e satisfação dos pacientes.",
      icon: BarChart3,
      color: "bg-secondary/10 text-secondary"
    },
    {
      title: "Prontuário Digital",
      description: "Registro clínico ágil com modelos personalizáveis e integração total com exames.",
      icon: Zap,
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Segurança e Ética",
      description: "Conformidade total com a LGPD e normas do CFM para proteção de dados sensíveis.",
      icon: ShieldCheck,
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
              Foco no Profissional
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6"
            >
              Tecnologia que Potencializa o Cuidado
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
            >
              O SAI oferece ferramentas avançadas para que você possa focar no que realmente importa: a saúde e o bem-estar dos seus pacientes.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-10 bg-white rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${tool.color}`}>
                  <tool.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-4">{tool.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {tool.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-24 p-12 bg-white rounded-[48px] shadow-2xl border border-gray-100 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif font-bold text-foreground">Menos burocracia, mais medicina</h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                Nossa plataforma automatiza as tarefas administrativas repetitivas, permitindo que você tenha mais tempo de qualidade com cada paciente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="p-6 bg-background rounded-3xl">
                  <p className="text-3xl font-serif font-bold text-primary mb-2">+25%</p>
                  <p className="text-sm text-gray-500">Aumento na produtividade clínica média.</p>
                </div>
                <div className="p-6 bg-background rounded-3xl">
                  <p className="text-3xl font-serif font-bold text-primary mb-2">-30%</p>
                  <p className="text-sm text-gray-500">Redução de faltas (no-shows) com lembretes automáticos.</p>
                </div>
              </div>
              <button className="bg-primary text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-primary-hover transition-all shadow-xl">
                Seja um Médico Parceiro
              </button>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-primary/5 rounded-[64px] absolute -top-10 -right-10 w-full h-full -z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=1000" 
                alt="Médico usando tablet"
                className="rounded-[48px] shadow-2xl object-cover w-full h-[500px]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
