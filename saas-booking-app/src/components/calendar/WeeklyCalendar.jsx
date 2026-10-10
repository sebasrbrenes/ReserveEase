import dayjs from 'dayjs';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const WeeklyCalendar = ({ selectedDate, onDateSelect, appointments }) => {
  // Weeks start on Monday, matching the column headers (dayjs counts from Sunday).
  const startOfWeek = selectedDate.subtract((selectedDate.day() + 6) % 7, 'day').startOf('day');

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = startOfWeek.add(index, 'day');
    const dayAppointments = appointments?.filter(apt => apt.localDate === date.format('YYYY-MM-DD')) || [];

    return {
      date,
      appointments: dayAppointments,
      isToday: date.isSame(dayjs(), 'day'),
      isSelected: date.isSame(selectedDate, 'day')
    };
  });

  const handlePrevWeek = () => {
    onDateSelect(selectedDate.subtract(1, 'week'));
  };

  const handleNextWeek = () => {
    onDateSelect(selectedDate.add(1, 'week'));
  };

  return (
    <div className="hd-card p-3 sm:p-6 w-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="hd-title text-3xl">
          {selectedDate.format('MMMM YYYY')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevWeek}
            aria-label="Previous week"
            className="p-1.5 text-ink border-2 border-ink-soft/40 hover:border-ink hover:bg-paper-deep rounded-lg transition-colors"
          >
            <FiChevronLeft aria-hidden="true" />
          </button>
          <button
            onClick={handleNextWeek}
            aria-label="Next week"
            className="p-1.5 text-ink border-2 border-ink-soft/40 hover:border-ink hover:bg-paper-deep rounded-lg transition-colors"
          >
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-xs font-bold text-ink-soft mb-2">
            {day}
          </div>
        ))}

        {days.map((day) => (
          <button
            type="button"
            key={day.date.format('YYYY-MM-DD')}
            onClick={() => onDateSelect(day.date)}
            aria-pressed={day.isSelected}
            aria-label={`${day.date.format('dddd, MMMM D')}${day.appointments.length ? `, ${day.appointments.length} appointments` : ''}`}
            className={`
              flex flex-col items-center px-0 py-2 sm:p-2 rounded-lg border-2 cursor-pointer transition-colors
              ${day.isSelected
                ? 'bg-sun border-ink text-ink font-bold'
                : day.isToday
                  ? 'bg-marker-light border-marker text-ink font-bold'
                  : 'border-transparent text-ink hover:bg-paper-deep hover:border-ink-soft/40'}
            `}
          >
            <span className="text-sm" aria-hidden="true">{day.date.format('D')}</span>
            {day.appointments.length > 0 && (
              <span className={`mt-1 w-1.5 h-1.5 rounded-full ${day.isSelected ? 'bg-ink' : 'bg-marker'}`}></span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
