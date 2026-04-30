import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { coreApi, mediaApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Input, { Textarea } from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ArrowLeft, Edit2 } from 'lucide-react';

export default function VehicleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const { data: vehicle, isLoading } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => coreApi.get(`/vehicles/${id}`).then(r => r.data),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['vehicle-sessions', id],
    queryFn: () => coreApi.get('/sessions', { params: { vehicleId: id, status: 'booked,in_progress,completed,cancelled' } }).then(r => r.data),
    enabled: !!id,
  });

  const form = useForm({ values: vehicle });

  const update = useMutation({
    mutationFn: (body) => coreApi.patch(`/vehicles/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vehicle', id] }); toast.success('Updated'); setEditing(false); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">{vehicleLabel}</h1>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 className="w-4 h-4" /></Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 grid sm:grid-cols-3 gap-4">
        {[['Year', vehicle.year], ['Make', vehicle.make], ['Model', vehicle.model],
          ['Color', vehicle.color], ['License plate', vehicle.license_plate], ['VIN', vehicle.vin]
        ].map(([label, val]) => (
          <div key={label}>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className="text-sm text-gray-900">{val || '—'}</div>
          </div>
        ))}
        {vehicle.notes && (
          <div className="sm:col-span-3">
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <div className="text-sm text-gray-900 whitespace-pre-wrap">{vehicle.notes}</div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Session history</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions for this vehicle.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <Link key={s.id} to={`/app/sessions/${s.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
                <div>
                  <div className="text-sm font-medium text-gray-900">{new Date(s.scheduled_at).toLocaleDateString()}</div>
                  <div className="text-xs text-gray-500">{fmt(s.total_price_cents)}</div>
                </div>
                <Badge status={s.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <Modal title="Edit vehicle" onClose={() => setEditing(false)}>
          <form onSubmit={form.handleSubmit(d => update.mutate({ ...d, year: d.year ? parseInt(d.year) : null }))} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Year" type="number" {...form.register('year')} />
              <Input label="Make" {...form.register('make')} />
              <Input label="Model" {...form.register('model')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Color" {...form.register('color')} />
              <Input label="License plate" {...form.register('licensePlate')} defaultValue={vehicle.license_plate} />
            </div>
            <Input label="VIN" {...form.register('vin')} />
            <Textarea label="Notes" {...form.register('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={form.formState.isSubmitting}>Save changes</Button>
              <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
