import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import { coreApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Input, { Textarea } from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { FileText, Plus, Trash2, ChevronRight } from 'lucide-react';

export default function Quotes() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes', statusFilter],
    queryFn: () => coreApi.get('/quotes', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers', ''],
    queryFn: () => coreApi.get('/customers', { params: { limit: 200 } }).then(r => r.data),
    enabled: creating,
  });

  const { register, handleSubmit, control, watch, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { items: [{ description: '', price: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items') || [];
  const totalCents = items.reduce((sum, i) => sum + Math.round((Number(i.price) || 0) * 100), 0);

  const create = useMutation({
    mutationFn: (body) => coreApi.post('/quotes', {
      customerId: body.customerId,
      notes: body.notes || null,
      items: body.items.map(i => ({ description: i.description, priceCents: Math.round((Number(i.price) || 0) * 100) })),
    }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['quotes'] }); toast.success('Quote created'); setCreating(false); reset(); navigate(`/app/quotes/${res.data.id}`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const STATUSES = ['draft', 'sent', 'accepted', 'declined', 'expired'];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New quote</Button>
      </div>

      <div className="flex gap-1.5 p-1 bg-gray-100 rounded-lg w-fit mb-4">
        <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${!statusFilter ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>All</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 text-sm rounded-md font-medium capitalize transition-colors ${statusFilter === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>{s}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={4} /></div>
        ) : quotes.length === 0 ? (
          <EmptyState icon={FileText} title="No quotes" description="Create a quote to send to a customer."
            action={<Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New quote</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Customer', 'Status', 'Total', 'Created', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {quotes.map(q => (
                <tr key={q.id} onClick={() => navigate(`/app/quotes/${q.id}`)} className="hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3 font-medium text-gray-900">{q.customer_name ?? q.customer_id?.slice(0, 8)}</td>
                  <td className="px-4 py-3"><Badge status={q.status} /></td>
                  <td className="px-4 py-3">{fmt(q.total_cents)}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(q.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right"><ChevronRight className="w-4 h-4 text-gray-400 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <Modal title="New quote" onClose={() => { setCreating(false); reset(); }} size="lg">
          <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Customer *</label>
              <select className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                {...register('customerId', { required: true })}>
                <option value="">Select customer…</option>
                {customersData?.data?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">Line items</label>
                <button type="button" onClick={() => append({ description: '', price: 0 })}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium">+ Add item</button>
              </div>
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={f.id} className="flex gap-2">
                    <input placeholder="Description" {...register(`items.${i}.description`, { required: true })}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    <input type="number" placeholder="$ 0.00" step="0.01" min="0" {...register(`items.${i}.price`, { valueAsNumber: true, min: 0 })}
                      className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    {fields.length > 1 && (
                      <button type="button" onClick={() => remove(i)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-2 text-sm font-semibold">Total: {fmt(totalCents)}</div>
            </div>
            <Textarea label="Notes" {...register('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>Create quote</Button>
              <Button variant="secondary" type="button" onClick={() => { setCreating(false); reset(); }}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
