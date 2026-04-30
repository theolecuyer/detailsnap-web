import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import axios from 'axios';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { fmt } from '../api/index.js';
import { Zap, CheckCircle } from 'lucide-react';

const publicApi = axios.create({ baseURL: import.meta.env.VITE_CORE_URL || 'http://localhost:8082' });

export default function PublicBooking() {
  const { shopSlug } = useParams();
  const [selectedServices, setSelectedServices] = useState([]);
  const [confirmed, setConfirmed] = useState(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-shop', shopSlug],
    queryFn: () => publicApi.get(`/public/shops/${shopSlug}`).then(r => r.data),
  });

  const { register, handleSubmit, formState: { errors } } = useForm();

  const mutation = useMutation({
    mutationFn: (payload) => publicApi.post(`/public/shops/${shopSlug}/bookings`, payload),
    onSuccess: (res) => { setConfirmed(res.data); },
    onError: (err) => { toast.error(err.response?.data?.error || 'Booking failed'); },
  });

  const toggle = (id) =>
    setSelectedServices(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const onSubmit = (vals) => {
    if (!selectedServices.length) return toast.error('Select at least one service');
    mutation.mutate({
      customerName: vals.customerName,
      email: vals.email,
      phone: vals.phone || null,
      vehicle: {
        year: vals.vehicleYear ? parseInt(vals.vehicleYear) : null,
        make: vals.vehicleMake || null,
        model: vals.vehicleModel || null,
        color: vals.vehicleColor || null,
        licensePlate: vals.licensePlate || null,
      },
      serviceIds: selectedServices,
      scheduledAt: vals.scheduledAt,
      notes: vals.notes || null,
    });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">Shop not found.</div>;

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
          <p className="text-gray-600 mb-1">
            Your appointment at <strong>{data.shop.name}</strong> is scheduled for:
          </p>
          <p className="text-lg font-semibold text-brand-600">
            {new Date(confirmed.scheduledAt).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-2">Confirmation ID: {confirmed.sessionId.slice(0, 8)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-brand-600" />
          <span className="text-xl font-bold text-gray-900">{data.shop.name}</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Services */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="font-semibold text-gray-900 mb-3">Select services</h2>
            {data.services.length === 0 && <p className="text-sm text-gray-500">No services available.</p>}
            <div className="space-y-2">
              {data.services.map(svc => (
                <label key={svc.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(svc.id)}
                    onChange={() => toggle(svc.id)}
                    className="rounded text-brand-600"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ background: svc.color }}
                      />
                      <span className="font-medium text-sm">{svc.name}</span>
                    </div>
                    {svc.description && <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <div className="font-semibold">{fmt(svc.base_price_cents)}</div>
                    <div className="text-gray-400">{svc.duration_minutes}min</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Appointment */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Appointment time</h2>
            <Input
              label="Date & Time"
              type="datetime-local"
              error={errors.scheduledAt?.message}
              {...register('scheduledAt', { required: 'Please pick a date and time' })}
            />
          </div>

          {/* Contact */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Your information</h2>
            <Input label="Full name" error={errors.customerName?.message}
              {...register('customerName', { required: 'Name is required' })} />
            <Input label="Email" type="email" error={errors.email?.message}
              {...register('email', { required: 'Email is required' })} />
            <Input label="Phone (optional)" type="tel" {...register('phone')} />
          </div>

          {/* Vehicle */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Vehicle details</h2>
            <div className="grid grid-cols-3 gap-3">
              <Input label="Year" type="number" placeholder="2020" {...register('vehicleYear')} />
              <Input label="Make" placeholder="Tesla" {...register('vehicleMake')} />
              <Input label="Model" placeholder="Model 3" {...register('vehicleModel')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Color" placeholder="Red" {...register('vehicleColor')} />
              <Input label="License plate" placeholder="ABC-123" {...register('licensePlate')} />
            </div>
          </div>

          <Button type="submit" className="w-full justify-center" size="lg" disabled={mutation.isPending}>
            {mutation.isPending ? 'Booking…' : 'Book appointment'}
          </Button>
        </form>
      </div>
    </div>
  );
}
