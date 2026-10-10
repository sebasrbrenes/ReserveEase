import { useState, useEffect, useMemo, useCallback } from 'react';
import { auth } from '../../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import dayjs from 'dayjs';
import {
  FiCalendar,
  FiLogOut,
  FiUsers,
  FiDollarSign,
  FiSettings,
  FiEdit2,
  FiXCircle,
  FiPlus,
  FiMessageSquare
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import AppointmentModal from '../appointments/AppointmentModal';
import AppointmentsView from '../appointments/AppointmentsView';
import { useSettings } from '../../context/SettingsContext';
import WeeklyCalendar from '../calendar/WeeklyCalendar';
import Feedback from '../feedback/Feedback';
import HelpButton from '../common/HelpButton';
import { Logo, Sparkle, Star, Underline } from '../ui/Doodles';
import {
  cancelAppointment, errorMessage, listAppointments, retryNotifications, transitionAppointment,
} from '../../services/api';
import NotificationStatus from '../appointments/NotificationStatus';
import { STATUS_ACTIONS, statusClass, statusLabel } from '../appointments/status';
import { formatLocalDate, formatMoney, formatTime, shiftDate, todayIn } from '../../utils/datetime';

// Appointments loaded around today; the API is the only source.
const PAST_DAYS = 60;
const FUTURE_DAYS = 120;
const REFRESH_MS = 60 * 1000;
// The cancel dialog renders in a portal, outside .hd-page and its focus ring.
const dialogFocus = 'focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-marker focus-visible:outline-offset-2';

const Dashboard = () => {
  const { business } = useSettings();
  const businessId = business.data?.businessId;
  const timezone = business.data?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currency = business.data?.currency || 'USD';
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const loadAppointments = useCallback(async () => {
    if (!businessId) return;
    try {
      const today = todayIn(timezone);
      setAppointments(await listAppointments(businessId, shiftDate(today, -PAST_DAYS), shiftDate(today, FUTURE_DAYS)));
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error(errorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [businessId, timezone]);

  // Load now, then refresh periodically and when the tab regains focus, so
  // bookings made on the public page show up without reloading.
  useEffect(() => {
    if (!businessId) {
      if (!business.loading) setIsLoading(false);
      return undefined;
    }
    loadAppointments();
    const timer = setInterval(loadAppointments, REFRESH_MS);
    window.addEventListener('focus', loadAppointments);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', loadAppointments);
    };
  }, [businessId, business.loading, loadAppointments]);

  const handleEditAppointment = (appointment) => {
    setAppointmentToEdit(appointment);
    setShowNewAppointment(true);
  };

  // Runs one change; a stale version means someone else changed it: reload.
  const runChange = async (change, successMessage) => {
    try {
      await change();
      toast.success(successMessage);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      await loadAppointments();
    }
  };

  const handleConfirmCancel = async () => {
    const apt = appointmentToCancel;
    if (!apt) return;
    setAppointmentToCancel(null);
    await runChange(
      () => cancelAppointment(businessId, apt.id, { expectedVersion: apt.version }),
      'Appointment cancelled. The time is free again.'
    );
  };

  const handleStatusChange = async (appointment, action) => {
    setEditingStatus(null);
    if (!action) return;
    if (action === 'cancelled') {
      setAppointmentToCancel(appointment);
      return;
    }
    await runChange(
      () => transitionAppointment(businessId, appointment.id, { expectedVersion: appointment.version, to: action }),
      'Status updated'
    );
  };

  const handleRetryEmail = (appointment) => runChange(
    () => retryNotifications(businessId, appointment.id),
    'Email queued again'
  );

  const selectedLocalDate = selectedDate.format('YYYY-MM-DD');

  const calendarAppointments = useMemo(
    () => appointments.filter((apt) => apt.status !== 'cancelled'),
    [appointments]
  );

  const currentViewAppointments = useMemo(
    () => appointments.filter((apt) => apt.localDate === selectedLocalDate),
    [appointments, selectedLocalDate]
  );

  const staffList = business.data?.staff || [];
  const activeStaff = staffList.filter((staff) => staff.active);

  // Counts only appointments that are still happening or happened.
  const metrics = useMemo(() => {
    const today = todayIn(timezone);
    const live = (apt) => apt.status === 'confirmed' || apt.status === 'completed';
    const todayAppointments = appointments.filter((apt) => apt.localDate === today && live(apt));
    const yesterdayAppointments = appointments.filter((apt) => apt.localDate === shiftDate(today, -1) && live(apt));
    const completedToday = todayAppointments.filter((apt) => apt.status === 'completed');
    const diff = todayAppointments.length - yesterdayAppointments.length;

    return [
      {
        id: 'todayAppointments',
        value: todayAppointments.length,
        title: "Today's appointments",
        subtext: diff === 0 ? 'Same as yesterday' : diff > 0 ? `${diff} more than yesterday` : `${-diff} fewer than yesterday`,
        type: diff === 0 ? 'neutral' : diff > 0 ? 'positive' : 'negative',
        icon: FiCalendar
      },
      {
        id: 'activeStaff',
        value: activeStaff.length,
        title: 'Active staff',
        subtext: !staffList.length
          ? 'No staff members'
          : activeStaff.length === staffList.length
          ? 'All staff active'
          : `${staffList.length - activeStaff.length} staff inactive`,
        type: 'neutral',
        icon: FiUsers
      },
      {
        id: 'todayValue',
        value: formatMoney(todayAppointments.reduce((total, apt) => total + (apt.serviceSnapshot?.priceMinor || 0), 0), currency),
        title: "Today's booked value",
        subtext: `${completedToday.length} of ${todayAppointments.length} completed`,
        type: 'neutral',
        icon: FiDollarSign
      }
    ];
  }, [appointments, timezone, currency, activeStaff.length, staffList.length]);

  return (
    <div className="hd-page">
      <div className="container mx-auto px-4 py-8 pb-24">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="relative inline-block">
              <Logo />
              <Sparkle className="absolute -right-7 -top-2 w-6 h-6 text-marker" />
            </h1>
            <p className="text-ink-soft mt-1">Manage your appointments and schedule</p>
          </div>
          <nav className="flex flex-wrap items-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="hd-btn hd-btn-secondary !px-3 !py-1.5 text-sm"
            >
              <FiMessageSquare className="w-4 h-4" aria-hidden="true" />
              <span>Feedback</span>
            </button>
            <Link
              to="/settings"
              className="hd-btn hd-btn-secondary !px-3 !py-1.5 text-sm"
            >
              <FiSettings className="w-4 h-4" aria-hidden="true" />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => signOut(auth)}
              className="hd-btn hd-btn-secondary !px-3 !py-1.5 text-sm"
            >
              <FiLogOut className="w-4 h-4" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </nav>
        </header>

        {!business.loading && business.data?.status !== 'published' && (
          <div className="hd-alert mb-6 border-ink bg-sun-light text-ink">
            {business.error
              ? errorMessage(business.error)
              : 'Your booking page is not live yet. Finish your services, staff and hours in '}
            {!business.error && <Link to="/settings" className="hd-link">Settings</Link>}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {metrics.map(metric => (
            <div
              key={metric.id}
              className="hd-card p-5"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-marker-light border-2 border-ink rounded-lg shrink-0">
                  <metric.icon className="w-6 h-6 text-marker" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-soft">{metric.title}</p>
                  <span className="text-2xl font-extrabold text-ink">{metric.value}</span>
                  <p className={`text-sm ${
                    metric.type === 'neutral'
                      ? 'text-ink-soft'
                      : metric.type === 'positive'
                      ? 'text-leaf font-semibold'
                      : 'text-coral font-semibold'
                  }`}>
                    {metric.subtext}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Appointments Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 min-w-0">
            <div className="hd-card p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h2 className="relative inline-block self-start">
                  <span className="hd-title text-4xl">{showAllAppointments ? 'All Appointments' : 'Upcoming Appointments'}</span>
                  <Underline className="absolute -bottom-2 left-0 w-full h-3 text-sun" />
                </h2>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAllAppointments(true)}
                    className="hd-btn hd-btn-secondary !px-4 !py-2 text-sm flex-1 sm:flex-none"
                  >
                    <FiCalendar className="w-4 h-4" aria-hidden="true" />
                    View All
                  </button>
                  <button
                    onClick={() => {
                      setShowNewAppointment(true);
                      setAppointmentToEdit(null);
                    }}
                    disabled={business.data?.status !== 'published'}
                    title={business.data?.status !== 'published' ? 'Finish your settings to take bookings' : undefined}
                    className="hd-btn !px-4 !py-2 text-sm flex-1 sm:flex-none"
                  >
                    <FiPlus className="w-4 h-4" aria-hidden="true" />
                    New Appointment
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-36">
                  <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin motion-reduce:animate-none" aria-hidden="true"></div>
                </div>
              ) : currentViewAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <Star className="mx-auto w-8 h-8 text-sun mb-2" />
                  <p className="hd-title text-3xl text-ink">No appointments scheduled for this date</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                  {currentViewAppointments.map((appointment) => (
                    <motion.div
                      key={`appointment-${appointment.id}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="group bg-paper p-4 rounded-xl border-2 border-ink-soft/30 hover:border-ink transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
                        <div className="min-w-0 break-words">
                          <h3 className="text-lg font-bold text-ink">{appointment.client?.name}</h3>
                          <p className="text-ink text-sm">
                            {formatLocalDate(appointment.localDate, { month: 'long', day: 'numeric', year: 'numeric' })} at {formatTime(appointment.startsAt, timezone)}
                          </p>
                          <p className="text-ink-soft text-sm">{appointment.serviceSnapshot?.name}</p>
                          <NotificationStatus notification={appointment.notification} onRetry={() => handleRetryEmail(appointment)} />
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto shrink-0">
                          <span className="hidden sm:inline text-ink-soft">{appointment.staffSnapshot?.displayName}</span>
                          <div className="flex items-center gap-2">
                            {editingStatus === appointment.id ? (
                              <select
                                autoFocus
                                aria-label="Change status"
                                className="hd-input !mt-0 !w-auto !py-1 text-xs"
                                value=""
                                onChange={(e) => handleStatusChange(appointment, e.target.value)}
                                onBlur={() => setEditingStatus(null)}
                              >
                                <option value="">{statusLabel(appointment.status)}</option>
                                {STATUS_ACTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                                ))}
                              </select>
                            ) : (
                              <button
                                onClick={() => appointment.status === 'confirmed' && setEditingStatus(appointment.id)}
                                className={`hd-badge ${statusClass(appointment.status)} ${appointment.status === 'confirmed' ? 'hover:opacity-80' : 'cursor-default'}`}
                                title={appointment.status === 'confirmed' ? 'Change status' : undefined}
                              >
                                {statusLabel(appointment.status)}
                              </button>
                            )}
                            <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditAppointment(appointment)}
                                className="p-1.5 rounded-lg text-marker hover:bg-marker-light transition-colors"
                                aria-label="Edit appointment"
                              >
                                <FiEdit2 className="w-4 h-4" aria-hidden="true" />
                              </button>
                              {appointment.status === 'confirmed' && (
                                <button
                                  onClick={() => setAppointmentToCancel(appointment)}
                                  className="p-1.5 rounded-lg text-ink-soft hover:text-coral hover:bg-coral-light transition-colors"
                                  aria-label="Cancel appointment"
                                >
                                  <FiXCircle className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0">
            <WeeklyCalendar
              appointments={calendarAppointments}
              selectedDate={selectedDate}
              onDateSelect={(date) => setSelectedDate(date)}
            />
          </div>
        </div>

        {/* Appointment Modal */}
        <AppointmentModal
          isOpen={showNewAppointment}
          onClose={() => {
            setShowNewAppointment(false);
            setAppointmentToEdit(null);
          }}
          appointment={appointmentToEdit}
          businessId={businessId}
          business={business.data}
          onSaved={loadAppointments}
        />

        {/* Appointments View Modal */}
        <AppointmentsView
          isOpen={showAllAppointments}
          onClose={() => setShowAllAppointments(false)}
          appointments={appointments}
          timezone={timezone}
          onEdit={handleEditAppointment}
          onCancel={setAppointmentToCancel}
          onStatusChange={handleStatusChange}
          onRetryEmail={handleRetryEmail}
        />

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {appointmentToCancel && (
            <Dialog
              open={Boolean(appointmentToCancel)}
              onClose={() => setAppointmentToCancel(null)}
              className="relative z-50"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-ink/40"
                aria-hidden="true"
              />

              <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel
                  as={motion.div}
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  transition={{ 
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="hd-card mx-auto w-full max-w-sm p-6 font-sans text-ink"
                >
                  <Dialog.Title className="hd-title text-3xl mb-3">
                    Cancel appointment
                  </Dialog.Title>
                  <Dialog.Description className="text-ink-soft mb-6">
                    Cancel {appointmentToCancel.client?.name}&apos;s appointment? The time becomes available to other clients.
                  </Dialog.Description>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      className={`hd-btn hd-btn-secondary !px-4 ${dialogFocus}`}
                      onClick={() => setAppointmentToCancel(null)}
                    >
                      Keep it
                    </button>
                    <button
                      className={`hd-btn !bg-coral !px-4 ${dialogFocus}`}
                      onClick={handleConfirmCancel}
                    >
                      Cancel appointment
                    </button>
                  </div>
                </Dialog.Panel>
              </div>
            </Dialog>
          )}
        </AnimatePresence>

        {/* Feedback Modal */}
        <Feedback 
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
        />
      </div>
      <HelpButton />
    </div>
  );
};

export default Dashboard;
