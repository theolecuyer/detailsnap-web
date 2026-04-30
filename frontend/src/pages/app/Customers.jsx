import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { coreApi } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Input, { Textarea } from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { Users, Plus, Search, ChevronRight } from 'lucide-react';

export default function Customers() {
  const [q, setQ] = useState('');
  const [showNew, setShowNew] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['customers', q],
    queryFn: () => coreApi.get('/customers', { params: { q: q || undefined, limit: 100 } }).then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const create = useMutation({
    mutationFn: (body) => coreApi.post('/customers', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer created');
      setShowNew(false);
      reset();
      navigate(`/app/customers/${res.data.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create customer'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="w-4 h-4" /> New customer
        </Button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search by name, email, or phone…"
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={4} /></div>
        ) : data?.data?.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No customers yet"
            description="Add your first customer to get started."
            action={<Button onClick={() => setShowNew(true)}><Plus className="w-4 h-4" />New customer</Button>}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Email', 'Phone', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data?.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/app/customers/${c.id}`)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-400"><ChevronRight className="w-4 h-4 ml-auto" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showNew && (
        <Modal title="New customer" onClose={() => { setShowNew(false); reset(); }}>
          <form onSubmit={handleSubmit(d => create.mutate(d))} className="space-y-4">
            <Input label="Name *" error={errors.name?.message}
              {...register('name', { required: 'Name is required' })} />
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Phone" type="tel" {...register('phone')} />
            <Input label="Address" {...register('address')} />
            <Textarea label="Notes" {...register('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create customer'}
              </Button>
              <Button variant="secondary" type="button" onClick={() => { setShowNew(false); reset(); }}>
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
