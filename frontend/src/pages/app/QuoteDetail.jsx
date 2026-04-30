import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { coreApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Input from '../../components/ui/Input.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ArrowLeft, Send, Check, X, CalendarPlus } from 'lucide-react';

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [acceptModal, setAcceptModal] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const { data: quote, isLoading } = useQuery({
    queryKey: ['quote', id],
    queryFn: () => coreApi.get(`/quotes/${id}`).then(r => r.data),
  });

  const action = (verb, extra) => useMutation({
    mutationFn: () => coreApi.post(`/quotes/${id}/${verb}`, extra || {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success(`Quote ${verb}ed`);
      setAcceptModal(false);
      if (verb === 'accept' && res.data.session) navigate(`/app/sessions/${res.data.session.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const sendMut = action('send');
  const declineMut = action('decline');
  const acceptMut = useMutation({
    mutationFn: () => coreApi.post(`/quotes/${id}/accept`, scheduledAt ? { scheduledAt, vehicleId: quote.vehicle_id } : {}),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['quote', id] });
      qc.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Quote accepted');
      setAcceptModal(false);
      if (res.data.session) navigate(`/app/sessions/${res.data.session.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!quote) return <div className="text-red-500">Quote not found.</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">Quote</h1>
        <Badge status={quote.status} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-sm text-gray-500 mb-1">Customer</div>
            <Link to={`/app/customers/${quote.customer?.id}`} className="font-semibold text-brand-600 hover:underline">
              {quote.customer?.name}
            </Link>
          </div>
          <div className="text-sm text-gray-500">Created {new Date(quote.created_at).toLocaleDateString()}</div>
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Line items</div>
          <div className="divide-y divide-gray-100">
            {quote.items?.map(item => (
              <div key={item.id} className="flex justify-between py-2">
                <span className="text-sm text-gray-900">{item.description}</span>
                <span className="text-sm font-medium">{fmt(item.price_cents)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold">
            <span>Total</span><span>{fmt(quote.total_cents)}</span>
          </div>
        </div>

        {quote.notes && (
          <div>
            <div className="text-xs text-gray-500 mb-1">Notes</div>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {quote.status === 'draft' && (
          <Button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}>
            <Send className="w-4 h-4" />Send quote
          </Button>
        )}
        {quote.status === 'sent' && (
          <>
            <Button onClick={() => setAcceptModal(true)}>
              <Check className="w-4 h-4" />Accept
            </Button>
            <Button variant="danger" onClick={() => declineMut.mutate()} disabled={declineMut.isPending}>
              <X className="w-4 h-4" />Decline
            </Button>
          </>
        )}
      </div>

      {acceptModal && (
        <Modal title="Accept quote" onClose={() => setAcceptModal(false)} size="sm">
          <p className="text-sm text-gray-600 mb-4">Optionally convert to a session by providing a scheduled date.</p>
          <Input label="Schedule session (optional)" type="datetime-local"
            value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
          <div className="flex gap-3 mt-4">
            <Button onClick={() => acceptMut.mutate()} disabled={acceptMut.isPending}>
              <CalendarPlus className="w-4 h-4" />
              {scheduledAt ? 'Accept & create session' : 'Accept quote'}
            </Button>
            <Button variant="secondary" onClick={() => setAcceptModal(false)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
