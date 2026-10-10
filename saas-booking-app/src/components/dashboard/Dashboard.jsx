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
import './select.css';
import logo from '../../assets/images/ReserveEaseLogoNObg.png';
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
    <div className="min-h-screen bg-[#1a1f2b]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <img src={logo} alt="ReserveEase logo" className="w-16 h-16 inline-block rotate-6" />
            <motion.div 
              className="text-2xl font-bold gradient-text text-white inline-block align-middle ml-2 transition duration-300 ease-in-out"
              whileHover={{ scale: 1.05 }}
            >
              <h1>ReserveEase</h1>
            </motion.div>
            <p className="text-gray-400">Manage your appointments and schedule</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4 w-full sm:w-auto">
            <button
              onClick={() => setIsFeedbackOpen(true)}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <FiMessageSquare className="w-5 h-5" />
              <span className="text-sm">Feedback</span>
            </button>
            <Link
              to="/settings"
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <FiSettings className="w-5 h-5" />
              <span className="text-sm">Settings</span>
            </Link>
            <button
              onClick={() => signOut(auth)}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <FiLogOut className="w-5 h-5" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>

        {!business.loading && business.data?.status !== 'published' && (
          <div className="mb-6 rounded-lg border border-yellow-600/50 bg-yellow-500/10 p-4 text-sm text-yellow-200">
            {business.error
              ? errorMessage(business.error)
              : 'Your booking page is not live yet. Finish your services, staff and hours in '}
            {!business.error && <Link to="/settings" className="underline">Settings</Link>}
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {metrics.map(metric => (
            <div
              key={metric.id}
              className="bg-[#242937] p-6 rounded-lg border border-gray-700"
            >
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <metric.icon className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{metric.title}</p>
                  <span className="text-2xl font-bold text-white">{metric.value}</span>
                  <p className={`text-sm ${
                    metric.type === 'neutral' 
                      ? 'text-gray-400' 
                      : metric.type === 'positive'
                      ? 'text-green-500'
                      : 'text-red-500'
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
          <div className="lg:col-span-2">
            <div className="bg-[#242937] rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
                <h2 className="text-xl font-semibold text-white">{showAllAppointments ? 'All Appointments' : 'Upcoming Appointments'}</h2>
                <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
                  <button
                    onClick={() => setShowAllAppointments(true)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
                  >
                    <FiCalendar className="w-4 h-4" />
                    View All
                  </button>
                  <button
                    onClick={() => {
                      setShowNewAppointment(true);
                      setAppointmentToEdit(null);
                    }}
                    disabled={business.data?.status !== 'published'}
                    title={business.data?.status !== 'published' ? 'Finish your settings to take bookings' : undefined}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiPlus className="w-4 h-4" />
                    New Appointment
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-36">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : currentViewAppointments.length === 0 ? (
                <p className="text-gray-400">No appointments scheduled for this date</p>
              ) : (
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {currentViewAppointments.map((appointment) => (
                    <motion.div
                      key={`appointment-${appointment.id}`}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="group bg-[#1a1f2b] p-4 rounded-lg hover:bg-[#2a303c] transition-colors border border-gray-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{appointment.client?.name}</h3>
                          <p className="text-gray-400 text-sm">
                            {formatLocalDate(appointment.localDate, { month: 'long', day: 'numeric', year: 'numeric' })} at {formatTime(appointment.startsAt, timezone)}
                          </p>
                          <p className="text-gray-400 text-sm">{appointment.serviceSnapshot?.name}</p>
                          <NotificationStatus notification={appointment.notification} onRetry={() => handleRetryEmail(appointment)} />
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                          <span className="hidden sm:inline text-gray-400">{appointment.staffSnapshot?.displayName}</span>
                          <div className="flex items-center gap-2">
                            {editingStatus === appointment.id ? (
                              <select
                                autoFocus
                                aria-label="Change status"
                                className="px-3 py-1 rounded-full text-xs bg-[#1a1f2b] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                                className={`px-3 py-1 rounded-full text-xs ${statusClass(appointment.status)} ${appointment.status === 'confirmed' ? '' : 'cursor-default'}`}
                                title={appointment.status === 'confirmed' ? 'Change status' : undefined}
                              >
                                {statusLabel(appointment.status)}
                              </button>
                            )}
                            <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditAppointment(appointment)}
                                className="text-blue-500 hover:text-blue-400 transition-colors"
                                aria-label="Edit appointment"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              {appointment.status === 'confirmed' && (
                                <button
                                  onClick={() => setAppointmentToCancel(appointment)}
                                  className="text-gray-400 hover:text-red-500 transition-colors"
                                  aria-label="Cancel appointment"
                                >
                                  <FiXCircle className="w-4 h-4" />
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
          <div>
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
                className="fixed inset-0 bg-black/30"
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
                  className="mx-auto max-w-sm rounded-lg bg-gray-800 p-6"
                >
                  <Dialog.Title className="text-xl font-medium text-white mb-4">
                    Cancel appointment
                  </Dialog.Title>
                  <Dialog.Description className="text-gray-300 mb-6">
                    Cancel {appointmentToCancel.client?.name}&apos;s appointment? The time becomes available to other clients.
                  </Dialog.Description>

                  <div className="flex justify-end gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                      onClick={() => setAppointmentToCancel(null)}
                    >
                      Keep it
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors"
                      onClick={handleConfirmCancel}
                    >
                      Cancel appointment
                    </motion.button>
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
