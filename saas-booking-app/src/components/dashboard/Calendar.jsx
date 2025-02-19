import { useState } from 'react';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useTime } from '../../context/TimeContext';

const Calendar = ({ onDateSelect, selectedDate }) => {
  const { currentDate } = useTime();
  const [currentMonth, setCurrentMonth] = useState(dayjs(currentDate));
  const selectedDayjs = dayjs(selectedDate);

  const daysInMonth = Array.from({ length: currentMonth.daysInMonth() }, (_, i) => {
    return currentMonth.date(i + 1);
  });

  const startDay = currentMonth.startOf('month').day();
  const endDay = currentMonth.endOf('month').day();

  // Add padding days at the start
  const paddingStart = Array.from({ length: startDay }, (_, i) => {
    return currentMonth.startOf('month').subtract(startDay - i, 'day');
  });

  // Add padding days at the end
  const paddingEnd = Array.from({ length: 6 - endDay }, (_, i) => {
    return currentMonth.endOf('month').add(i + 1, 'day');
  });

  const allDays = [...paddingStart, ...daysInMonth, ...paddingEnd];

  const handlePrevMonth = () => {
    setCurrentMonth(currentMonth.subtract(1, 'month'));
  };

  const handleNextMonth = () => {
    setCurrentMonth(currentMonth.add(1, 'month'));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiChevronLeft className="text-gray-400" />
        </button>

        <h2 className="text-lg font-semibold text-white">
          {currentMonth.format('MMMM YYYY')}
        </h2>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <FiChevronRight className="text-gray-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-400 py-2"
          >
            {day}
          </div>
        ))}

        {allDays.map((day) => {
          const isSelected = selectedDayjs.isSame(day, 'day');
          const isCurrentMonth = day.month() === currentMonth.month();
          const isToday = day.isSame(currentDate, 'day');

          return (
            <motion.button
              key={day.valueOf()}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onDateSelect(day.toDate())}
              className={`
                rounded-lg p-2 text-sm relative
                ${!isCurrentMonth && 'text-gray-600'}
                ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}
                ${isToday && !isSelected && 'text-blue-400'}
              `}
            >
              {day.format('D')}
              {isToday && !isSelected && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default Calendar;
