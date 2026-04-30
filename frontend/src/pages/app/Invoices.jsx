import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { coreApi, fmt } from '../../api/index.js';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { Receipt, ChevronRight } from 'lucide-react';

export default function Invoices() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('unpaid');

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', tab],
    queryFn: () => coreApi.get('/invoices', { params: { status: tab || undefined } }).then(r => r.data),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invoices</h1>

      <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg w-fit mb-4">
        {['unpaid', 'paid', 'void', ''].map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize transition-colors ${tab === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={6} cols={4} /></div>
        ) : invoices.length === 0 ? (
          <EmptyState icon={Receipt} title="No invoices" description="Invoices are created automatically when sessions are completed." />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Customer', 'Status', 'Total', 'Date', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => (
                <tr key={inv.id} onClick={() => navigate(`/app/invoices/${inv.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900">{inv.customer_name}</td>
                  <td className="px-4 py-3"><Badge status={inv.status} /></td>
                  <td className="px-4 py-3 text-gray-900">{fmt(inv.total_cents)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(inv.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-gray-400 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
