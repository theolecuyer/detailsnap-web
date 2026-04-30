import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { coreApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Input, { Textarea } from '../../components/ui/Input.jsx';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const STEPS = ['Customer', 'Vehicle', 'Services', 'Schedule'];

export default function NewSession() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [serviceIds, setServiceIds] = useState([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => coreApi.get('/customers', { params: { q: search || undefined, limit: 20 } }).then(r => r.data),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['customer-vehicles', customerId],
    queryFn: () => coreApi.get(`/customers/${customerId}/vehicles`).then(r => r.data),
    enabled: !!customerId,
  });

  const { data: services = [] } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: () => coreApi.get('/services', { params: { active: 'true' } }).then(r => r.data),
  });

  const selectedCustomer = customersData?.data?.find(c => c.id === customerId);
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const selectedServices = services.filter(s => serviceIds.includes(s.id));
  const total = selectedServices.reduce((sum, s) => sum + s.base_price_cents, 0);

  const create = useMutation({
    mutationFn: () => coreApi.post('/sessions', { customerId, vehicleId, serviceIds, scheduledAt, notes: notes || null }),
    onSuccess: (res) => { toast.success('Session created!'); navigate(`/app/sessions/${res.data.id}`); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create session'),
  });

  const toggleService = (id) =>
    setServiceIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const canNext = [
    !!customerId,
    !!vehicleId,
    serviceIds.length > 0,
    !!scheduledAt,
  ][step];

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-gray-900">New session</h1>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i < step ? 'bg-brand-600 text-white' : i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' : 'bg-gray-200 text-gray-500'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-200 mx-1" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Step 0: Customer */}
        {step === 0 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Select customer</h2>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customers…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {customersData?.data?.map(c => (
                <button key={c.id} onClick={() => { setCustomerId(c.id); setVehicleId(''); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left border transition-colors ${customerId === c.id ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">{c.name[0]}</div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.email || c.phone || ''}</div>
                  </div>
                  {customerId === c.id && <Check className="w-4 h-4 text-brand-600 ml-auto" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Vehicle */}
        {step === 1 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-1">Select vehicle</h2>
            <p className="text-sm text-gray-500 mb-4">For {selectedCustomer?.name}</p>
            {vehicles.length === 0 ? (
              <p className="text-sm text-gray-400">This customer has no vehicles. Add one on their profile first.</p>
            ) : (
              <div className="space-y-2">
                {vehicles.map(v => (
                  <button key={v.id} onClick={() => setVehicleId(v.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${vehicleId === v.id ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{[v.year, v.make, v.model].filter(Boolean).join(' ') || 'Unknown'}</div>
                      <div className="text-xs text-gray-400">{[v.color, v.license_plate].filter(Boolean).join(' · ')}</div>
                    </div>
                    {vehicleId === v.id && <Check className="w-4 h-4 text-brand-600 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Services */}
        {step === 2 && (
          <div>
            <h2 className="font-semibold text-gray-900 mb-4">Select services</h2>
            <div className="space-y-2">
              {services.map(svc => (
                <button key={svc.id} onClick={() => toggleService(svc.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors ${serviceIds.includes(svc.id) ? 'border-brand-500 bg-brand-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'}`}>
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ background: svc.color }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{svc.name}</div>
                    <div className="text-xs text-gray-400">{svc.duration_minutes}min</div>
                  </div>
                  <div className="text-sm font-semibold text-gray-900">{fmt(svc.base_price_cents)}</div>
                  {serviceIds.includes(svc.id) && <Check className="w-4 h-4 text-brand-600" />}
                </button>
              ))}
            </div>
            {serviceIds.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm font-semibold">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Schedule */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-900">Schedule</h2>
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
              <div className="font-medium">{selectedCustomer?.name}</div>
              <div className="text-gray-500">{[selectedVehicle?.year, selectedVehicle?.make, selectedVehicle?.model].filter(Boolean).join(' ')}</div>
              <div className="text-gray-500">{selectedServices.map(s => s.name).join(', ')}</div>
              <div className="font-semibold text-brand-600">{fmt(total)}</div>
            </div>
            <Input label="Date & time *" type="datetime-local"
              value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
            <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button variant="secondary" onClick={() => step === 0 ? navigate(-1) : setStep(s => s - 1)}>
          <ArrowLeft className="w-4 h-4" />{step === 0 ? 'Cancel' : 'Back'}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}>
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={() => create.mutate()} disabled={!canNext || create.isPending}>
            {create.isPending ? 'Creating…' : 'Create session'}
          </Button>
        )}
      </div>
    </div>
  );
}
