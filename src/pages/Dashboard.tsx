import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Dashboard() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse text-primary font-serif text-2xl italic">
          Carregando perfil...
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-8 text-center">
        <div className="max-w-md">
          <h2 className="text-2xl font-serif font-bold text-foreground mb-4">Perfil não encontrado</h2>
          <p className="text-gray-500 mb-8">Não conseguimos carregar o seu perfil de utilizador. Por favor, tente recarregar a página ou contacte o suporte.</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary text-white px-8 py-3 rounded-full font-bold hover:bg-primary-hover transition-all"
          >
            Recarregar Página
          </button>
        </div>
      </div>
    );
  }

  switch (profile.role) {
    case 'patient':
      return <Navigate to="/patient" />;
    case 'doctor':
      return <Navigate to="/doctor" />;
    case 'receptionist':
      return <Navigate to="/receptionist" />;
    case 'admin':
      return <Navigate to="/admin" />;
    default:
      return <Navigate to="/patient" />;
  }
}
