import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/AppLayout.jsx';

import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import AcceptInvite from './pages/AcceptInvite.jsx';
import PublicBooking from './pages/PublicBooking.jsx';

import Dashboard from './pages/app/Dashboard.jsx';
import Customers from './pages/app/Customers.jsx';
import CustomerDetail from './pages/app/CustomerDetail.jsx';
import VehicleDetail from './pages/app/VehicleDetail.jsx';
import Services from './pages/app/Services.jsx';
import Sessions from './pages/app/Sessions.jsx';
import NewSession from './pages/app/NewSession.jsx';
import SessionDetail from './pages/app/SessionDetail.jsx';
import Calendar from './pages/app/Calendar.jsx';
import Quotes from './pages/app/Quotes.jsx';
import QuoteDetail from './pages/app/QuoteDetail.jsx';
import Invoices from './pages/app/Invoices.jsx';
import InvoiceDetail from './pages/app/InvoiceDetail.jsx';
import Staff from './pages/app/Staff.jsx';
import Settings from './pages/app/Settings.jsx';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/invites/:token" element={<AcceptInvite />} />
      <Route path="/book/:shopSlug" element={<PublicBooking />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/:id" element={<CustomerDetail />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="services" element={<Services />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="sessions/new" element={<NewSession />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="quotes/:id" element={<QuoteDetail />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="staff" element={<Staff />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
