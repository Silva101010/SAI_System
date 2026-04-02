/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import AdminDashboard from './pages/AdminDashboard';
import LandingPage from './pages/LandingPage';
import About from './pages/About';
import Contact from './pages/Contact';
import HowItWorks from './pages/HowItWorks';
import ForPatients from './pages/ForPatients';
import ForDoctors from './pages/ForDoctors';
import { Toaster } from 'sonner';

export default function App() {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse text-primary font-serif text-2xl italic">
          Carregando SAI...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Toaster position="top-right" richColors />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/sobre" element={<About />} />
        <Route path="/contato" element={<Contact />} />
        <Route path="/como-funciona" element={<HowItWorks />} />
        <Route path="/para-pacientes" element={<ForPatients />} />
        <Route path="/para-medicos" element={<ForDoctors />} />
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
        
        {/* Protected Dashboard Entry */}
        <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        
        {/* Role-specific Routes */}
        <Route 
          path="/patient" 
          element={user && profile?.role === 'patient' ? <PatientDashboard /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/doctor" 
          element={user && profile?.role === 'doctor' ? <DoctorDashboard /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/receptionist" 
          element={user && profile?.role === 'receptionist' ? <ReceptionistDashboard /> : <Navigate to="/dashboard" />} 
        />
        <Route 
          path="/admin" 
          element={user && profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/dashboard" />} 
        />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

