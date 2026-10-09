import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
import FacultyDashboard from './pages/FacultyDashboard.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import { FacultyPage, RoomsPage, SectionsPage, SubjectsPage } from './pages/admin/ResourceManagementPage.jsx';
import TimetablePage from './pages/admin/TimetablePage.jsx';
import QuizManagementPage from './pages/admin/QuizManagementPage.jsx';
import EventsPage from './pages/admin/EventsPage.jsx';
import { useAuth } from './context/AuthContext.jsx';

function RoleHome() {
  const { user } = useAuth();
  const destination = { ADMIN: '/admin', FACULTY: '/faculty', STUDENT: '/student' }[user?.role] || '/login';
  return <Navigate to={destination} replace />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="auth-loading">Loading your workspace…</div>;
  return user ? <RoleHome /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route element={<ProtectedRoute />}>
        <Route index element={<RoleHome />} />
        <Route element={<AppLayout />}>
          <Route path="admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Suspense fallback={<div className="analytics-loading">Loading dashboard…</div>}><AdminDashboard /></Suspense></ProtectedRoute>} />
          <Route path="admin/rooms" element={<ProtectedRoute allowedRoles={['ADMIN']}><RoomsPage /></ProtectedRoute>} />
          <Route path="admin/faculty" element={<ProtectedRoute allowedRoles={['ADMIN']}><FacultyPage /></ProtectedRoute>} />
          <Route path="admin/subjects" element={<ProtectedRoute allowedRoles={['ADMIN']}><SubjectsPage /></ProtectedRoute>} />
          <Route path="admin/sections" element={<ProtectedRoute allowedRoles={['ADMIN']}><SectionsPage /></ProtectedRoute>} />
          <Route path="admin/timetable" element={<ProtectedRoute allowedRoles={['ADMIN']}><TimetablePage /></ProtectedRoute>} />
          <Route path="admin/quizzes" element={<ProtectedRoute allowedRoles={['ADMIN']}><QuizManagementPage /></ProtectedRoute>} />
          <Route path="admin/events" element={<ProtectedRoute allowedRoles={['ADMIN']}><EventsPage /></ProtectedRoute>} />
          <Route path="faculty" element={<ProtectedRoute allowedRoles={['FACULTY']}><FacultyDashboard /></ProtectedRoute>} />
          <Route path="student" element={<ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
