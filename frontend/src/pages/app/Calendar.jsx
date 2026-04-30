import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, startOfMonth, endOfMonth } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { coreApi } from '../../api/index.js';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 0 }),
  getDay,
  locales: { 'en-US': enUS },
});

export default function Calendar() {
  const navigate = useNavigate();
  const [range, setRange] = useState({
    from: format(startOfMonth(new Date()), "yyyy-MM-dd'T'00:00:00"),
    to: format(endOfMonth(new Date()), "yyyy-MM-dd'T'23:59:59"),
  });

  const { data: events = [] } = useQuery({
    queryKey: ['calendar', range.from, range.to],
    queryFn: () => coreApi.get('/calendar', { params: { from: range.from, to: range.to } }).then(r => r.data),
  });

  const calEvents = events.map(e => ({
    id: e.id,
    title: e.title,
    start: new Date(e.start),
    end: new Date(e.end),
    resource: e,
  }));

  const handleRangeChange = (newRange) => {
    let from, to;
    if (Array.isArray(newRange)) {
      from = format(newRange[0], "yyyy-MM-dd'T'00:00:00");
      to = format(newRange[newRange.length - 1], "yyyy-MM-dd'T'23:59:59");
    } else {
      from = format(newRange.start, "yyyy-MM-dd'T'00:00:00");
      to = format(newRange.end, "yyyy-MM-dd'T'23:59:59");
    }
    setRange({ from, to });
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Calendar</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-4" style={{ height: 'calc(100vh - 200px)' }}>
        <BigCalendar
          localizer={localizer}
          events={calEvents}
          startAccessor="start"
          endAccessor="end"
          onRangeChange={handleRangeChange}
          onSelectEvent={event => navigate(`/app/sessions/${event.id}`)}
          eventPropGetter={event => ({
            style: {
              backgroundColor: event.resource?.color || '#3B82F6',
              borderColor: event.resource?.color || '#3B82F6',
            },
          })}
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
        />
      </div>
    </div>
  );
}
