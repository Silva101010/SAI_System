import { motion } from 'motion/react';
import { UserCheck, Smartphone, Clock, History, Bell, ShieldCheck } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';

export default function ForPatients() {
  const benefits = [
    {
      title: "Agendamento Online",
      description: "Agende suas consultas de qualquer lugar, a qualquer hora, com apenas alguns cliques.",
      icon: UserCheck,
      color: "bg-info/10 text-info"
    },
    {
      title: "Check-in via QR Code",
      description: "Chegue na clínica e confirme sua presença instantaneamente, sem filas na recepção.",
      icon: Smartphone,
      color: "bg-primary/10 text-primary"
    },
    {
      title: "Acompanhamento em Tempo Real",
      description: "Saiba exatamente sua posição na fila e o tempo estimado para o seu atendimento.",
      icon: Clock,
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Histórico Médico",
      description: "Acesse seus laudos, prescrições e histórico de consultas de forma centralizada e segura.",
      icon: History,
      color: "bg-secondary/10 text-secondary"
    },
    {
      title: "Notificações Inteligentes",
      description: "Receba lembretes de consultas e avisos sobre mudanças no status do seu atendimento.",
      icon: Bell,
      color: "bg-accent/10 text-accent"
    },
    {
      title: "Segurança de Dados",
      description: "Seus dados de saúde são protegidos com criptografia de ponta a ponta e total privacidade.",
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
              Experiência do Paciente
            </motion.span>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6"
            >
              Cuidado que Respeita seu Tempo
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed"
            >
              O SAI foi desenhado para oferecer a você uma jornada de saúde tranquila, transparente e sem esperas desnecessárias.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-10 bg-white rounded-[40px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group"
              >
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-8 transition-transform group-hover:scale-110 ${benefit.color}`}>
                  <benefit.icon className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground mb-4">{benefit.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {benefit.description}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-24 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square bg-primary/5 rounded-[64px] absolute -top-10 -right-10 w-full h-full -z-10"></div>
              <img 
                src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=1000" 
                alt="Paciente usando smartphone"
                className="rounded-[48px] shadow-2xl object-cover w-full h-[500px]"
                referrerPolicy="no-referrer"
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-4xl font-serif font-bold text-foreground">Tudo na palma da sua mão</h2>
              <p className="text-lg text-gray-500 leading-relaxed">
                Com o nosso portal do paciente, você tem controle total sobre sua saúde. Chega de carregar pastas de exames ou ficar pendurado no telefone para marcar uma consulta.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-foreground font-bold">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">✓</div>
                  Agendamento 24h por dia
                </li>
                <li className="flex items-center gap-3 text-foreground font-bold">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">✓</div>
                  Cancelamento sem burocracia
                </li>
                <li className="flex items-center gap-3 text-foreground font-bold">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white">✓</div>
                  Acesso imediato a prescrições
                </li>
              </ul>
              <button className="bg-primary text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-primary-hover transition-all shadow-xl">
                Criar minha conta agora
              </button>
            </motion.div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
