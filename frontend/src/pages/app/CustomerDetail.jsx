import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { coreApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Input, { Textarea } from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ArrowLeft, Plus, Car, Edit2 } from 'lucide-react';

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [addingVehicle, setAddingVehicle] = useState(false);

  const { data: customer, isLoading: cLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => coreApi.get(`/customers/${id}`).then(r => r.data),
  });

  const { data: vehicles = [], isLoading: vLoading } = useQuery({
    queryKey: ['customer-vehicles', id],
    queryFn: () => coreApi.get(`/customers/${id}/vehicles`).then(r => r.data),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['customer-sessions', id],
    queryFn: () => coreApi.get('/sessions', { params: { customerId: id, status: 'booked,in_progress,completed,cancelled' } }).then(r => r.data),
  });

  const editForm = useForm({ values: customer });
  const vehicleForm = useForm();

  const updateCustomer = useMutation({
    mutationFn: (body) => coreApi.patch(`/customers/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer', id] }); toast.success('Updated'); setEditing(false); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const addVehicle = useMutation({
    mutationFn: (body) => coreApi.post(`/customers/${id}/vehicles`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customer-vehicles', id] }); toast.success('Vehicle added'); setAddingVehicle(false); vehicleForm.reset(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (cLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Edit2 className="w-4 h-4" /></Button>
      </div>

      {/* Contact info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid sm:grid-cols-2 gap-4">
        <div><div className="text-xs text-gray-500 mb-1">Email</div><div className="text-sm text-gray-900">{customer.email || '—'}</div></div>
        <div><div className="text-xs text-gray-500 mb-1">Phone</div><div className="text-sm text-gray-900">{customer.phone || '—'}</div></div>
        <div><div className="text-xs text-gray-500 mb-1">Address</div><div className="text-sm text-gray-900">{customer.address || '—'}</div></div>
        <div><div className="text-xs text-gray-500 mb-1">Customer since</div><div className="text-sm text-gray-900">{new Date(customer.created_at).toLocaleDateString()}</div></div>
        {customer.notes && <div className="sm:col-span-2"><div className="text-xs text-gray-500 mb-1">Notes</div><div className="text-sm text-gray-900 whitespace-pre-wrap">{customer.notes}</div></div>}
      </div>

      {/* Vehicles */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Car className="w-4 h-4" />Vehicles</h2>
          <Button variant="secondary" size="sm" onClick={() => setAddingVehicle(true)}><Plus className="w-4 h-4" />Add vehicle</Button>
        </div>
        {vLoading ? <Skeleton className="h-16 w-full" /> : vehicles.length === 0 ? (
          <p className="text-sm text-gray-400">No vehicles on file.</p>
        ) : (
          <div className="space-y-2">
            {vehicles.map(v => (
              <Link
                key={v.id}
                to={`/app/vehicles/${v.id}`}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors"
              >
                <div>
                  <div className="font-medium text-sm text-gray-900">
                    {[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown vehicle'}
                  </div>
                  <div className="text-xs text-gray-500">{[v.color, v.license_plate].filter(Boolean).join(' · ')}</div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-400 rotate-180" />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Session history */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Session history</h2>
          <Link to={`/app/sessions/new`}><Button variant="secondary" size="sm"><Plus className="w-4 h-4" />New session</Button></Link>
        </div>
        {!sessionsData ? <Skeleton className="h-16 w-full" /> : sessionsData.length === 0 ? (
          <p className="text-sm text-gray-400">No sessions yet.</p>
        ) : (
          <div className="space-y-2">
            {sessionsData.map(s => (
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
        <Modal title="Edit customer" onClose={() => setEditing(false)}>
          <form onSubmit={editForm.handleSubmit(d => updateCustomer.mutate(d))} className="space-y-4">
            <Input label="Name" {...editForm.register('name', { required: true })} />
            <Input label="Email" type="email" {...editForm.register('email')} />
            <Input label="Phone" {...editForm.register('phone')} />
            <Input label="Address" {...editForm.register('address')} />
            <Textarea label="Notes" {...editForm.register('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={editForm.formState.isSubmitting}>Save changes</Button>
              <Button variant="secondary" type="button" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}

      {addingVehicle && (
        <Modal title="Add vehicle" onClose={() => setAddingVehicle(false)}>
          <form onSubmit={vehicleForm.handleSubmit(d => addVehicle.mutate({ ...d, year: d.year ? parseInt(d.year) : null }))} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Input label="Year" type="number" {...vehicleForm.register('year')} />
              <Input label="Make" {...vehicleForm.register('make')} />
              <Input label="Model" {...vehicleForm.register('model')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Color" {...vehicleForm.register('color')} />
              <Input label="License plate" {...vehicleForm.register('licensePlate')} />
            </div>
            <Input label="VIN" {...vehicleForm.register('vin')} />
            <Textarea label="Notes" {...vehicleForm.register('notes')} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={vehicleForm.formState.isSubmitting}>Add vehicle</Button>
              <Button variant="secondary" type="button" onClick={() => setAddingVehicle(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
