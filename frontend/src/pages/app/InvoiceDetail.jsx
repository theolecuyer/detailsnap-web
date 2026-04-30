import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { coreApi, fmt } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ArrowLeft, CreditCard, Ban } from 'lucide-react';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [payModal, setPayModal] = useState(false);
  const [method, setMethod] = useState('fake-card');

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', id],
    queryFn: () => coreApi.get(`/invoices/${id}`).then(r => r.data),
  });

  const pay = useMutation({
    mutationFn: () => coreApi.post(`/invoices/${id}/pay`, { method }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice marked paid'); setPayModal(false); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const voidInv = useMutation({
    mutationFn: () => coreApi.post(`/invoices/${id}/void`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['invoice', id] }); qc.invalidateQueries({ queryKey: ['invoices'] }); toast.success('Invoice voided'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>;
  if (!invoice) return <div className="text-red-500">Invoice not found.</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">Invoice</h1>
        <Badge status={invoice.status} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Customer</div>
            <Link to={`/app/customers/${invoice.customer?.id}`} className="font-semibold text-brand-600 hover:underline text-sm">
              {invoice.customer?.name}
            </Link>
          </div>
          {invoice.session_id && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Session</div>
              <Link to={`/app/sessions/${invoice.session_id}`} className="text-sm text-brand-600 hover:underline">
                View session →
              </Link>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Created</div>
            <div className="text-sm text-gray-900">{new Date(invoice.created_at).toLocaleDateString()}</div>
          </div>
          {invoice.paid_at && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Paid</div>
              <div className="text-sm text-gray-900">{new Date(invoice.paid_at).toLocaleDateString()} · {invoice.payment_method}</div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-between font-bold text-lg">
          <span>Total</span><span>{fmt(invoice.total_cents)}</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {invoice.status === 'unpaid' && (
          <>
            <Button onClick={() => setPayModal(true)}>
              <CreditCard className="w-4 h-4" />Mark as paid
            </Button>
            {user?.role === 'owner' && (
              <Button variant="secondary" onClick={() => voidInv.mutate()} disabled={voidInv.isPending}>
                <Ban className="w-4 h-4" />Void invoice
              </Button>
            )}
          </>
        )}
      </div>

      {payModal && (
        <Modal title="Mark invoice paid" onClose={() => setPayModal(false)} size="sm">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Payment method</label>
              <select value={method} onChange={e => setMethod(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="fake-card">Card</option>
                <option value="cash">Cash</option>
                <option value="check">Check</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => pay.mutate()} disabled={pay.isPending}>Confirm payment</Button>
              <Button variant="secondary" onClick={() => setPayModal(false)}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
