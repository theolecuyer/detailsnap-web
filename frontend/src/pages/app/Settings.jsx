import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { authApi } from '../../api/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import { Skeleton } from '../../components/ui/Skeleton.jsx';

export default function Settings() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: shop, isLoading } = useQuery({
    queryKey: ['shop'],
    queryFn: () => authApi.get('/shop').then(r => r.data),
  });

  const form = useForm({ values: shop });

  const update = useMutation({
    mutationFn: (body) => authApi.patch('/shop', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['shop'] }); toast.success('Settings saved'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  if (user?.role !== 'owner') {
    return <div className="text-gray-500 text-sm">Only shop owners can view settings.</div>;
  }

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64 w-full" /></div>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Shop settings</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={form.handleSubmit(d => update.mutate(d))} className="space-y-4">
          <Input label="Shop name" {...form.register('name')} />
          <Input label="Email" type="email" {...form.register('email')} />
          <Input label="Phone" type="tel" {...form.register('phone')} />
          <Input label="Address" {...form.register('address')} />

          <div className="pt-2">
            <div className="text-xs text-gray-500 mb-1">Public booking URL</div>
            <div className="text-sm font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 break-all">
              {window.location.origin}/book/{shop?.slug}
            </div>
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
