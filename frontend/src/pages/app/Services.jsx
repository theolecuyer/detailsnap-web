import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { coreApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Input, { Textarea } from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import { SkeletonTable } from '../../components/ui/Skeleton.jsx';
import { Wrench, Plus, Edit2, Trash2 } from 'lucide-react';

function ServiceForm({ defaultValues, onSubmit, onCancel, isSubmitting }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues });
  const handleSubmitDollars = (d) => {
    onSubmit({ ...d, basePriceCents: Math.round((d.price ?? 0) * 100), durationMinutes: Math.round((d.durationHours ?? 1) * 60) });
  };
  return (
    <form onSubmit={handleSubmit(handleSubmitDollars)} className="space-y-4">
      <Input label="Service name *" error={errors.name?.message}
        {...register('name', { required: 'Required' })} />
      <Textarea label="Description" {...register('description')} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Price ($) *" type="number" step="0.01" min="0" error={errors.price?.message}
          {...register('price', { required: 'Required', valueAsNumber: true, min: 0 })} />
        <Input label="Duration (hr) *" type="number" step="0.5" min="0.5"
          {...register('durationHours', { valueAsNumber: true, min: 0.5 })} />
      </div>
      <div className="flex items-end gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium text-gray-700">Calendar color</label>
          <input type="color" className="h-9 w-full rounded-lg border border-gray-300 cursor-pointer"
            {...register('color')} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
          <input type="checkbox" className="rounded" {...register('active')} />
          Active
        </label>
      </div>
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save service'}</Button>
        <Button variant="secondary" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function Services() {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const qc = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => coreApi.get('/services').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (b) => coreApi.post('/services', b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); toast.success('Service created'); setCreating(false); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const update = useMutation({
    mutationFn: ({ id, ...b }) => coreApi.patch(`/services/${id}`, b),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); toast.success('Updated'); setEditing(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const remove = useMutation({
    mutationFn: (id) => coreApi.delete(`/services/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['services'] }); toast.success('Service removed'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Services</h1>
        <Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New service</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={4} cols={4} /></div>
        ) : services.length === 0 ? (
          <EmptyState icon={Wrench} title="No services yet"
            description="Define your service offerings to start booking sessions."
            action={<Button onClick={() => setCreating(true)}><Plus className="w-4 h-4" />New service</Button>} />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Service', 'Price', 'Duration', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {services.map(svc => (
                <tr key={svc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: svc.color }} />
                      <span className="font-medium text-gray-900">{svc.name}</span>
                    </div>
                    {svc.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{svc.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{fmt(svc.base_price_cents)}</td>
                  <td className="px-4 py-3 text-gray-500">{(svc.duration_minutes / 60) % 1 === 0 ? svc.duration_minutes / 60 : (svc.duration_minutes / 60).toFixed(1)}hr</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${svc.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {svc.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setEditing(svc)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove.mutate(svc.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && (
        <Modal title="New service" onClose={() => setCreating(false)}>
          <ServiceForm
            defaultValues={{ price: 0, color: '#3B82F6', durationHours: 1, active: true }}
            onSubmit={(d) => create.mutate(d)}
            onCancel={() => setCreating(false)}
            isSubmitting={create.isPending}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit service" onClose={() => setEditing(null)}>
          <ServiceForm
            defaultValues={{ ...editing, price: (editing.base_price_cents / 100).toFixed(2), durationHours: (editing.duration_minutes / 60) }}
            onSubmit={(d) => update.mutate({ id: editing.id, ...d })}
            onCancel={() => setEditing(null)}
            isSubmitting={update.isPending}
          />
        </Modal>
      )}
    </div>
  );
}
