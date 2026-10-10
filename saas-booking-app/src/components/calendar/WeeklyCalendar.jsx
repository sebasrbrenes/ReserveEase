import dayjs from 'dayjs';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const WeeklyCalendar = ({ selectedDate, onDateSelect, appointments }) => {
  const startOfWeek = selectedDate.startOf('week');

  const days = Array.from({ length: 7 }).map((_, index) => {
    const date = startOfWeek.add(index, 'day');
    const dayAppointments = appointments?.filter(apt => 
      dayjs(apt.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    ) || [];

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
    <div className="bg-[#242937] rounded-xl p-4 sm:p-6 w-full overflow-x-auto">
      <div className="flex items-center justify-between mb-4 min-w-[420px] sm:min-w-0">
        <h2 className="text-lg font-semibold text-white">
          {selectedDate.format('MMMM YYYY')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a303c] rounded-lg transition-colors"
          >
            <FiChevronLeft />
          </button>
          <button
            onClick={handleNextWeek}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-[#2a303c] rounded-lg transition-colors"
          >
            <FiChevronRight />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 min-w-[420px] sm:min-w-0">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="text-center text-xs text-gray-400 mb-2">
            {day}
          </div>
        ))}

        {days.map((day) => (
          <div
            key={day.date.format('YYYY-MM-DD')}
            onClick={() => onDateSelect(day.date)}
            className={`
              flex flex-col items-center p-2 rounded-lg cursor-pointer transition-colors
              ${day.isSelected 
                ? 'bg-blue-500 text-white' 
                : day.isToday 
                  ? 'bg-[#2a303c] text-white' 
                  : 'text-gray-400 hover:bg-[#2a303c] hover:text-white'}
            `}
          >
            <span className="text-sm">{day.date.format('D')}</span>
            {day.appointments.length > 0 && (
              <span className="mt-1 w-1 h-1 rounded-full bg-blue-500"></span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WeeklyCalendar;
