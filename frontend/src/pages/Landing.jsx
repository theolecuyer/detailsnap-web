import { Link } from 'react-router-dom';
import { Zap, CheckCircle, Users, CalendarCheck, Receipt, Camera } from 'lucide-react';

const features = [
  { icon: Users, title: 'Customer Management', desc: 'Track every customer, vehicle, and service history in one place.' },
  { icon: CalendarCheck, title: 'Job Scheduling', desc: 'Book sessions, assign services, and monitor progress from booked to complete.' },
  { icon: Camera, title: 'Photo Documentation', desc: 'Upload before/after photos per session. Presigned URLs keep your S3 bucket private.' },
  { icon: Receipt, title: 'Quotes & Invoices', desc: 'Send professional quotes, convert to sessions, and collect payment in one workflow.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Zap className="w-7 h-7 text-brand-200" />
          <span className="text-xl font-bold">DetailSnap</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm text-brand-100 hover:text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
            Sign in
          </Link>
          <Link to="/signup" className="text-sm bg-white text-brand-700 font-semibold px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors">
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="text-center px-6 py-24 max-w-3xl mx-auto">
        <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
          The CRM built for<br />
          <span className="text-brand-200">car detailing shops</span>
        </h1>
        <p className="text-lg text-brand-100 mb-10 max-w-xl mx-auto">
          Manage customers, schedule jobs, track photos, send quotes, and collect payments — all in one clean dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/signup"
            className="bg-white text-brand-700 font-bold px-8 py-3 rounded-xl hover:bg-brand-50 transition-colors text-base"
          >
            Start free — no credit card
          </Link>
          <Link
            to="/login"
            className="border border-white/40 text-white px-8 py-3 rounded-xl hover:bg-white/10 transition-colors text-base"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white/10 backdrop-blur-sm py-16">
        <div className="max-w-5xl mx-auto px-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 rounded-xl p-5 hover:bg-white/20 transition-colors">
              <Icon className="w-6 h-6 text-brand-200 mb-3" />
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-brand-100">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section className="py-16 max-w-2xl mx-auto px-6 text-center">
        <h2 className="text-2xl font-bold mb-8">Everything your shop needs</h2>
        <ul className="text-left space-y-3">
          {[
            'Multi-tenant: each shop sees only their own data',
            'Staff invites with role-based access (owner / staff)',
            'Public booking page with your shop URL',
            'Session workflow: booked → in progress → completed',
            'Auto-generate invoice on session completion',
            'Calendar view of all scheduled jobs',
          ].map(item => (
            <li key={item} className="flex items-start gap-3 text-brand-100">
              <CheckCircle className="w-5 h-5 text-brand-300 mt-0.5 shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <footer className="text-center py-8 text-brand-300 text-sm">
        © {new Date().getFullYear()} DetailSnap · Built with Go, Node.js, Java & React
      </footer>
    </div>
  );
}
