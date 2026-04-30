import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { coreApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { CalendarCheck, Plus, ChevronRight } from 'lucide-react';

const STATUSES = ['booked', 'in_progress', 'completed', 'cancelled'];

export default function Sessions() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('booked,in_progress');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions', statusFilter, from, to],
    queryFn: () => coreApi.get('/sessions', {
      params: {
        status: statusFilter || undefined,
        from: from || undefined,
        to: to || undefined,
      },
    }).then(r => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <Link to="/app/sessions/new">
          <Button><Plus className="w-4 h-4" />New session</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg">
          <button
            onClick={() => setStatusFilter('booked,in_progress')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${statusFilter === 'booked,in_progress' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active
          </button>
          {STATUSES.map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize transition-colors ${statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {s.replace('_', ' ')}
            </button>
          ))}
          <button onClick={() => setStatusFilter('')}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${statusFilter === '' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            All
          </button>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          <span className="text-gray-400">—</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={5} /></div>
        ) : sessions.length === 0 ? (
          <EmptyState icon={CalendarCheck} title="No sessions found"
            description="Try changing filters or create a new session."
            action={<Link to="/app/sessions/new"><Button><Plus className="w-4 h-4" />New session</Button></Link>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Scheduled', 'Customer', 'Status', 'Total', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sessions.map(s => (
                <tr key={s.id} onClick={() => navigate(`/app/sessions/${s.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 text-gray-700">
                    {new Date(s.scheduled_at).toLocaleDateString()}<br />
                    <span className="text-xs text-gray-400">{new Date(s.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.customer_name ?? s.customer_id?.slice(0, 8) ?? '—'}</td>
                  <td className="px-4 py-3"><Badge status={s.status} /></td>
                  <td className="px-4 py-3 text-gray-700">{fmt(s.total_price_cents)}</td>
                  <td className="px-4 py-3 text-right text-gray-400"><ChevronRight className="w-4 h-4 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
