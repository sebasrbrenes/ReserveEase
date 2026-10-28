import { useState } from 'react';
import dayjs from 'dayjs';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';

// A whole month at a glance. The arrows change the month shown; they never
// change the selected day, so nothing jumps to a different weekday.
const MonthCalendar = ({ selectedDate, onDateSelect, appointments }) => {
  const { language, t: { calendar: copy } } = useLanguage();
  const [month, setMonth] = useState(() => (selectedDate || dayjs()).startOf('month'));

  // Follow the selection when it changes to a day in another month.
  const [seenSelection, setSeenSelection] = useState(selectedDate);
  if (selectedDate !== seenSelection) {
    setSeenSelection(selectedDate);
    if (selectedDate && !selectedDate.isSame(month, 'month')) setMonth(selectedDate.startOf('month'));
  }

  // Weeks start on Monday or Sunday by language, matching the column headers
  // (dayjs counts from Sunday).
  const lead = (month.day() - copy.weekStartsOn + 7) % 7;
  const gridStart = month.subtract(lead, 'day');
  const weeks = Math.ceil((lead + month.daysInMonth()) / 7);

  const counts = {};
  for (const apt of appointments || []) counts[apt.localDate] = (counts[apt.localDate] || 0) + 1;

  const days = Array.from({ length: weeks * 7 }).map((_, index) => {
    const date = gridStart.add(index, 'day');
    return {
      date,
      count: counts[date.format('YYYY-MM-DD')] || 0,
      inMonth: date.isSame(month, 'month'),
      isToday: date.isSame(dayjs(), 'day'),
      isSelected: Boolean(selectedDate && date.isSame(selectedDate, 'day')),
    };
  });

  const navButton = 'p-1.5 text-ink border-2 border-ink-soft/40 hover:border-ink hover:bg-paper-deep rounded-lg transition-colors';

  return (
    <div className="hd-card p-3 sm:p-6 w-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h2 className="hd-title text-3xl capitalize" aria-live="polite">
          {month.locale(language).format('MMMM YYYY')}
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => setMonth(month.subtract(1, 'month'))} aria-label={copy.previous} className={navButton}>
            <FiChevronLeft aria-hidden="true" />
          </button>
          {!month.isSame(dayjs(), 'month') && (
            <button type="button" onClick={() => setMonth(dayjs().startOf('month'))} className={`${navButton} text-sm font-semibold px-2`}>
              {copy.today}
            </button>
          )}
          <button type="button" onClick={() => setMonth(month.add(1, 'month'))} aria-label={copy.next} className={navButton}>
            <FiChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
        {copy.weekdays.map((day) => (
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
            aria-label={`${day.date.locale(language).format(copy.dayLabel)}${day.count ? `, ${copy.count(day.count)}` : ''}`}
            className={`
              flex flex-col items-center px-0 py-2 sm:p-2 rounded-lg border-2 cursor-pointer transition-colors
              ${day.isSelected
                ? 'bg-sun border-ink text-ink font-bold'
                : day.isToday
                  ? 'bg-marker-light border-marker text-ink font-bold'
                  : `border-transparent hover:bg-paper-deep hover:border-ink-soft/40 ${day.inMonth ? 'text-ink' : 'text-ink-soft'}`}
            `}
          >
            <span className="text-sm" aria-hidden="true">{day.date.format('D')}</span>
            <span
              className={`mt-1 w-1.5 h-1.5 rounded-full ${day.count ? (day.isSelected ? 'bg-ink' : 'bg-marker') : 'bg-transparent'}`}
              aria-hidden="true"
            ></span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MonthCalendar;
