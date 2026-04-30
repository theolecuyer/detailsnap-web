const statusColors = {
  booked:      'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-600',
  draft:       'bg-gray-100 text-gray-600',
  sent:        'bg-blue-100 text-blue-700',
  accepted:    'bg-green-100 text-green-700',
  declined:    'bg-red-100 text-red-700',
  expired:     'bg-orange-100 text-orange-700',
  unpaid:      'bg-yellow-100 text-yellow-700',
  paid:        'bg-green-100 text-green-700',
  void:        'bg-gray-100 text-gray-500',
  owner:       'bg-brand-100 text-brand-700',
  staff:       'bg-gray-100 text-gray-600',
};

export default function Badge({ status, label }) {
  const text = label ?? status?.replace('_', ' ');
  const color = statusColors[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${color}`}>
      {text}
    </span>
  );
}
