import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/index.js';
import { useAuth } from '../context/AuthContext.jsx';
import Input from '../components/ui/Input.jsx';
import Button from '../components/ui/Button.jsx';
import { Zap } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ name, password }) => {
    try {
      const { data } = await authApi.post('/invites/accept', { token, name, password });
      localStorage.setItem('ds_token', data.token);
      localStorage.setItem('ds_user', JSON.stringify(data.user));
      toast.success('Welcome to the team!');
      navigate('/app');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to accept invite');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-7 h-7 text-brand-600" />
          <span className="text-2xl font-bold text-gray-900">DetailSnap</span>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-2">You've been invited!</h1>
          <p className="text-sm text-gray-500 mb-6">Set your name and password to join the team.</p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Your name"
              placeholder="Your full name"
              error={errors.name?.message}
              {...register('name', { required: 'Name is required' })}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
              })}
            />
            <Button type="submit" className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? 'Joining…' : 'Join shop'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
