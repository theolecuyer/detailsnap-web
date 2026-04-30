import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { UserCog, Plus, Trash2, Copy } from 'lucide-react';

export default function Staff() {
  const { user: me } = useAuth();
  const qc = useQueryClient();
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState(null);

  const { data: staff = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => authApi.get('/staff').then(r => r.data),
  });

  const { data: invites = [] } = useQuery({
    queryKey: ['staff-invites'],
    queryFn: () => authApi.get('/staff/invites').then(r => r.data),
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();

  const sendInvite = useMutation({
    mutationFn: (body) => authApi.post('/staff/invites', body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['staff-invites'] });
      const link = `${window.location.origin}/invites/${res.data.token}`;
      setInviteLink(link);
      setInviting(false);
      reset();
      toast.success('Invite created');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const revokeInvite = useMutation({
    mutationFn: (id) => authApi.delete(`/staff/invites/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-invites'] }); toast.success('Invite revoked'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const removeStaff = useMutation({
    mutationFn: (id) => authApi.delete(`/staff/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff'] }); toast.success('Staff removed'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Staff</h1>
        <Button onClick={() => setInviting(true)}><Plus className="w-4 h-4" />Invite staff</Button>
      </div>

      {inviteLink && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-sm text-green-800 font-medium mb-2">Invite link (share this with the new staff member):</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-white border border-green-200 rounded px-2 py-1.5 break-all">{inviteLink}</code>
            <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success('Copied!'); }}
              className="text-green-700 hover:text-green-900 p-1.5">
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Staff list */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><UserCog className="w-4 h-4" />Team members</h2>
        <div className="space-y-2">
          {staff.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">{s.name[0]}</div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{s.name} {s.id === me?.id && <span className="text-gray-400">(you)</span>}</div>
                  <div className="text-xs text-gray-500">{s.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge status={s.role} />
                {me?.role === 'owner' && s.id !== me?.id && (
                  <button onClick={() => removeStaff.mutate(s.id)} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Pending invites</h2>
          <div className="space-y-2">
            {invites.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-dashed border-gray-200">
                <div>
                  <div className="text-sm font-medium text-gray-900">{inv.email}</div>
                  <div className="text-xs text-gray-400">Expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
                </div>
                <button onClick={() => revokeInvite.mutate(inv.id)} className="text-gray-400 hover:text-red-500 p-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviting && (
        <Modal title="Invite staff member" onClose={() => setInviting(false)} size="sm">
          <form onSubmit={handleSubmit(d => sendInvite.mutate(d))} className="space-y-4">
            <Input label="Email address" type="email" error={errors.email?.message}
              {...register('email', { required: 'Email is required' })} />
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={isSubmitting}>Send invite</Button>
              <Button variant="secondary" type="button" onClick={() => setInviting(false)}>Cancel</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
