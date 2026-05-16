export type UserRole = 'patient' | 'doctor' | 'receptionist' | 'admin';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  specialty?: string;
  contact?: string;
  missedAppointments?: number;
  attendanceScore?: number;
  createdAt?: string;
  photoURL?: string;
  crm?: string;
  bio?: string;
}

export type AppointmentStatus = 'scheduled' | 'checked-in' | 'in-progress' | 'completed' | 'cancelled' | 'no-show' | 'pending';

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  dateTime: string; // ISO 8601
  status: AppointmentStatus;
  checkInTime?: string; // ISO 8601
  priority?: number;
  notes?: string;
}

export interface DoctorSchedule {
  id: string;
  doctorId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  slotDuration: number;
}

export interface Specialty {
  id: string;
  name: string;
  description?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'alert' | 'info' | 'success';
  time: string; // ISO 8601
  read: boolean;
}
