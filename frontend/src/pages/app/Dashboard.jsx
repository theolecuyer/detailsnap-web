import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { coreApi, fmt } from '../../api/index.js';
import Badge from '../../components/ui/Badge.jsx';
import { SkeletonCard } from '../../components/ui/Skeleton.jsx';
import { TrendingUp, Receipt, Users, CalendarCheck } from 'lucide-react';

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => coreApi.get('/dashboard').then(r => r.data),
  });

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Revenue this month", value: fmt(data.revenueThisMonthCents), icon: TrendingUp, color: 'text-green-600' },
    { label: "Revenue last month", value: fmt(data.revenueLastMonthCents), icon: TrendingUp, color: 'text-gray-400' },
    { label: "Open invoices", value: `${data.openInvoiceCount} · ${fmt(data.openInvoiceTotalCents)}`, icon: Receipt, color: 'text-yellow-600' },
    { label: "Today's sessions", value: data.todaysSessions.length, icon: CalendarCheck, color: 'text-brand-600' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Today's sessions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-brand-600" />
            Today's schedule
          </h2>
          {data.todaysSessions.length === 0 ? (
            <p className="text-sm text-gray-400">No sessions scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {data.todaysSessions.map(s => (
                <Link
                  key={s.id}
                  to={`/app/sessions/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.customer_name}</div>
                    <div className="text-xs text-gray-500">{new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <Badge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-gray-400" />
            Upcoming sessions
          </h2>
          {data.upcomingSessions.length === 0 ? (
            <p className="text-sm text-gray-400">No upcoming sessions.</p>
          ) : (
            <div className="space-y-2">
              {data.upcomingSessions.map(s => (
                <Link
                  key={s.id}
                  to={`/app/sessions/${s.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">{s.customer_name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(s.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })} ·{' '}
                      {new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <Badge status={s.status} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent customers */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-600" />
            Recent customers
          </h2>
          {data.recentCustomers.length === 0 ? (
            <p className="text-sm text-gray-400">No customers yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.recentCustomers.map(c => (
                <Link
                  key={c.id}
                  to={`/app/customers/${c.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                    {c.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-500">{c.email || c.phone || 'No contact'}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
