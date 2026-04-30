import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { coreApi, mediaApi, fmt } from '../../api/index.js';
import Button from '../../components/ui/Button.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';
import { ArrowLeft, Play, CheckSquare, XCircle, Send, Plus, Camera, X } from 'lucide-react';

const PHOTO_TABS = ['before', 'after', 'inspection', 'general'];

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [noteText, setNoteText] = useState('');
  const [photoTab, setPhotoTab] = useState('before');
  const [confirmAction, setConfirmAction] = useState(null);
  const fileRef = useRef();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => coreApi.get(`/sessions/${id}`).then(r => r.data),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['session-photos', id],
    queryFn: () => mediaApi.get('/photos', { params: { sessionId: id } }).then(r => r.data),
    enabled: !!id,
  });

  const actionMutation = (action) => useMutation({
    mutationFn: () => coreApi.post(`/sessions/${id}/${action}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['session', id] }); toast.success(`Session ${action}ed`); setConfirmAction(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const startMut = actionMutation('start');
  const completeMut = actionMutation('complete');
  const cancelMut = actionMutation('cancel');

  const addNote = useMutation({
    mutationFn: () => coreApi.post(`/sessions/${id}/notes`, { body: noteText }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['session', id] }); setNoteText(''); toast.success('Note added'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const uploadPhoto = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('sessionId', id);
      fd.append('tag', photoTab);
      return mediaApi.post('/photos', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['session-photos', id] }); toast.success('Photo uploaded'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Upload failed'),
  });

  const deletePhoto = useMutation({
    mutationFn: (photoId) => mediaApi.delete(`/photos/${photoId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['session-photos', id] }); toast.success('Photo deleted'); },
  });

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;
  if (!session) return <div className="text-red-500">Session not found.</div>;

  const tabPhotos = photos.filter(p => p.tag === photoTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold text-gray-900">Session</h1>
        <Badge status={session.status} />
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <Link to={`/app/customers/${session.customer?.id}`} className="text-lg font-semibold text-brand-600 hover:underline">
              {session.customer?.name}
            </Link>
            <div className="text-sm text-gray-500">
              {[session.vehicle?.year, session.vehicle?.make, session.vehicle?.model].filter(Boolean).join(' ')} · {session.vehicle?.license_plate}
            </div>
            <div className="text-sm text-gray-500">
              {new Date(session.scheduled_at).toLocaleString()}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {session.status === 'booked' && (
              <>
                <Button onClick={() => setConfirmAction('start')} variant="secondary">
                  <Play className="w-4 h-4" />Start
                </Button>
                <Button onClick={() => setConfirmAction('cancel')} variant="secondary">
                  <XCircle className="w-4 h-4" />Cancel
                </Button>
              </>
            )}
            {session.status === 'in_progress' && (
              <Button onClick={() => setConfirmAction('complete')}>
                <CheckSquare className="w-4 h-4" />Mark complete
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Services & total */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Services</h2>
        <div className="space-y-2">
          {session.services?.map(svc => (
            <div key={svc.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ background: svc.color }} />
                <span className="text-sm text-gray-900">{svc.name}</span>
              </div>
              <span className="text-sm font-medium">{fmt(svc.price_cents)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
            <span>Total</span><span>{fmt(session.total_price_cents)}</span>
          </div>
        </div>
        {session.notes && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">Session notes</div>
            <div className="text-sm text-gray-900 whitespace-pre-wrap">{session.notes}</div>
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Photos</h2>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Camera className="w-4 h-4" />Upload
          </Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
            onChange={e => { if (e.target.files[0]) uploadPhoto.mutate(e.target.files[0]); e.target.value = ''; }} />
        </div>

        <div className="flex gap-1.5 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
          {PHOTO_TABS.map(t => (
            <button key={t} onClick={() => setPhotoTab(t)}
              className={`px-3 py-1.5 text-xs rounded-md font-medium capitalize transition-colors ${photoTab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>

        {tabPhotos.length === 0 ? (
          <p className="text-sm text-gray-400">No {photoTab} photos yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {tabPhotos.map(p => (
              <div key={p.id} className="relative group aspect-square rounded-lg overflow-hidden bg-gray-100">
                <img src={p.url} alt={p.caption || p.tag} className="w-full h-full object-cover" />
                <button
                  onClick={() => deletePhoto.mutate(p.id)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes thread */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Technician notes</h2>
        {session.session_notes?.length > 0 && (
          <div className="space-y-3 mb-4">
            {session.session_notes.map(n => (
              <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{n.user_name}</span>
                  <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{n.body}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note…"
            rows={2}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <Button onClick={() => addNote.mutate()} disabled={!noteText.trim() || addNote.isPending} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {confirmAction && (
        <Modal title={`Confirm: ${confirmAction}`} onClose={() => setConfirmAction(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">
            {confirmAction === 'complete'
              ? 'This will mark the session complete and automatically create an invoice.'
              : `Are you sure you want to ${confirmAction} this session?`}
          </p>
          <div className="flex gap-3">
            <Button
              variant={confirmAction === 'cancel' ? 'danger' : 'primary'}
              onClick={() => {
                if (confirmAction === 'start') startMut.mutate();
                if (confirmAction === 'complete') completeMut.mutate();
                if (confirmAction === 'cancel') cancelMut.mutate();
              }}
              disabled={startMut.isPending || completeMut.isPending || cancelMut.isPending}
            >
              Confirm
            </Button>
            <Button variant="secondary" onClick={() => setConfirmAction(null)}>Cancel</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
