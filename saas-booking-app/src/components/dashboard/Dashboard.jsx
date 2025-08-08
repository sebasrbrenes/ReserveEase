import { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog } from '@headlessui/react';
import dayjs from 'dayjs';
import { 
  FiCalendar, 
  FiClock, 
  FiLogOut, 
  FiUsers, 
  FiDollarSign,
  FiSettings,
  FiPlusCircle,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiMessageSquare
} from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { appointmentsService } from '../../services/appointments';
import { toast } from 'react-hot-toast';
import AppointmentModal from '../appointments/AppointmentModal';
import AppointmentsView from '../appointments/AppointmentsView';
import { useSettings } from '../../context/SettingsContext';
import WeeklyCalendar from '../calendar/WeeklyCalendar';
import Feedback from '../feedback/Feedback';
import HelpButton from '../common/HelpButton';
import './select.css';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { sendAppointmentConfirmation } from '../../services/emailService';

const Dashboard = () => {
  const [user] = useAuthState(auth);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [showNewAppointment, setShowNewAppointment] = useState(false);
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showDayView, setShowDayView] = useState(false);
  const [appointmentToEdit, setAppointmentToEdit] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState(null);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  // Load appointments
  useEffect(() => {
    if (!user) {
      console.log('No user logged in');
      return;
    }

    console.log('Current user ID:', user.uid);
    setIsLoading(true);

    try {
      // Create query for real-time updates
      const appointmentsQuery = query(
        collection(db, 'appointments'),
        where('userId', '==', user.uid),
        orderBy('date', 'asc')  // Only order by date, we'll sort by time in memory
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(appointmentsQuery, (snapshot) => {
        console.log('Appointments updated in real-time');
        const fetchedAppointments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort appointments by date and time in memory
        const sortedAppointments = fetchedAppointments.sort((a, b) => {
          const dateA = dayjs(`${a.date} ${a.time}`, 'YYYY-MM-DD HH:mm A');
          const dateB = dayjs(`${b.date} ${b.time}`, 'YYYY-MM-DD HH:mm A');
          return dateA.diff(dateB);
        });

        // Store all appointments for the view all modal
        setAppointments(sortedAppointments);

        // Filter future appointments with 5-minute grace period
        const now = dayjs();
        const upcomingAppointments = sortedAppointments.filter(apt => {
          const aptDateTime = dayjs(`${apt.date} ${apt.time}`, 'YYYY-MM-DD HH:mm A');
          // Add 5-minute grace period
          return aptDateTime.add(-5, 'minute').isAfter(now);
        });

        console.log('Upcoming appointments:', upcomingAppointments);
        setUpcomingAppointments(upcomingAppointments);
        setIsLoading(false);
      }, (error) => {
        console.error('Error loading appointments:', error);
        toast.error('Failed to load appointments');
        setIsLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up appointments listener:', error);
      toast.error('Failed to set up appointments listener');
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Debug auth state
    console.log('Auth state:', {
      user: user ? {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        uidChars: user.uid.split('').map((char, i) => `${i}:${char}`).join(', ')
      } : null,
      isLoading: !user,
      isAuthenticated: !!user
    });
  }, [user]);

  const handleEditAppointment = (appointment) => {
    setAppointmentToEdit(appointment);
    setShowNewAppointment(true);
  };

  const handleDeleteClick = (appointment) => {
    setAppointmentToDelete(appointment);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!appointmentToDelete) return;

    try {
      const appointmentRef = doc(db, 'appointments', appointmentToDelete.id);
      await deleteDoc(appointmentRef);
      toast.success('Appointment deleted successfully');
      setShowDeleteConfirm(false);
      setAppointmentToDelete(null);
    } catch (error) {
      console.error('Error deleting appointment:', error);
      toast.error('Failed to delete appointment');
    }
  };

  const handleSaveAppointment = async (formData) => {
    try {
      if (!user) {
        console.error('No user logged in');
        toast.error('Please log in to create appointments');
        return;
      }

      // Convert 12-hour time format to 24-hour format for storage
      const [hours, minutes] = formData.time.match(/(\d+):(\d+)/).slice(1);
      const period = formData.time.includes('PM') ? 'PM' : 'AM';
      let hour24 = parseInt(hours);
      
      if (period === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (period === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      const time24 = `${hour24.toString().padStart(2, '0')}:${minutes}`;

      console.log('Creating/updating appointment for user:', user.uid);
      if (appointmentToEdit) {
        await appointmentsService.update(appointmentToEdit.id, {
          clientName: formData.clientName,
          email: formData.email,
          phone: formData.phone,
          date: formData.date,
          time: time24,
          service: formData.service,
          staffMember: formData.staffMember || 'No preference',
          notes: formData.notes,
          createdBy: user.displayName || user.email,
          creatorId: user.uid
        }, user.uid);

        // Send confirmation email for updated appointment
        await sendAppointmentConfirmation({
          email: formData.email,
          clientName: formData.clientName,
          businessName: settings?.business?.name || 'Our Business',
          date: dayjs(formData.date).format('MMMM D, YYYY'),
          time: formData.time
        });

        toast.success('Appointment updated successfully');
      } else {
        await appointmentsService.create({
          clientName: formData.clientName,
          email: formData.email,
          phone: formData.phone,
          date: formData.date,
          time: time24,
          service: formData.service,
          staffMember: formData.staffMember || 'No preference',
          notes: formData.notes,
          status: "Pending",
          createdBy: user.displayName || user.email,
          creatorId: user.uid
        }, user.uid);

        // Send confirmation email for new appointment
        await sendAppointmentConfirmation({
          email: formData.email,
          clientName: formData.clientName,
          businessName: settings?.business?.name || 'Our Business',
          date: dayjs(formData.date).format('MMMM D, YYYY'),
          time: formData.time
        });

        toast.success('Appointment created successfully');
      }
      setShowNewAppointment(false);
      setAppointmentToEdit(null);
    } catch (error) {
      console.error('Error saving appointment:', error);
      toast.error('Failed to save appointment');
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    setEditingStatus(appointmentId);
    
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, { status: newStatus });
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setEditingStatus(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Attended':
        return 'bg-green-500/20 text-green-500';
      case 'Canceled':
        return 'bg-red-500/20 text-red-500';
      default:
        return 'bg-yellow-500/20 text-yellow-500';
    }
  };

  const calendarAppointments = useMemo(() => {
    if (!appointments?.length) return [];

    const selectedDateTime = selectedDate ? dayjs(selectedDate).startOf('day') : dayjs().startOf('day');
    return appointments.filter(apt => {
      const aptDate = dayjs(apt.date);
      return aptDate.isSame(selectedDateTime, 'day') || aptDate.isAfter(selectedDateTime, 'day');
    });
  }, [appointments, selectedDate]);

  // Filter appointments for the current view
  const currentViewAppointments = useMemo(() => {
    if (!appointments?.length) return [];

    const selectedDateTime = selectedDate ? dayjs(selectedDate).startOf('day') : dayjs().startOf('day');
    return appointments.filter(apt => {
      const aptDate = dayjs(apt.date);
      return aptDate.isSame(selectedDateTime, 'day');
    });
  }, [appointments, selectedDate]);

  const activeStaff = useMemo(() => {
    return settings?.business?.staff?.filter(staff => staff.active !== false) || [];
  }, [settings?.business?.staff]);

  const metrics = useMemo(() => {
    const todayAppointments = appointments.filter(apt => 
      dayjs(apt.date).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
    );

    const yesterdayAppointments = appointments.filter(apt => 
      dayjs(apt.date).format('YYYY-MM-DD') === dayjs().subtract(1, 'day').format('YYYY-MM-DD')
    );

    return [
      {
        id: 'todayAppointments',
        title: 'Today\'s Appointments',
        value: todayAppointments.length,
        subtext: todayAppointments.length === yesterdayAppointments.length
          ? 'Same as yesterday'
          : todayAppointments.length > yesterdayAppointments.length
          ? `${todayAppointments.length - yesterdayAppointments.length} more than yesterday`
          : `${Math.abs(todayAppointments.length - yesterdayAppointments.length)} less than yesterday`,
        type: todayAppointments.length === yesterdayAppointments.length
          ? 'neutral'
          : todayAppointments.length > yesterdayAppointments.length
          ? 'positive'
          : 'negative',
        icon: FiCalendar
      },
      {
        id: 'activeStaff',
        title: 'Active Staff',
        value: activeStaff.length,
        subtext: !settings?.business?.staff?.length 
          ? 'No staff members'
          : activeStaff.length === settings?.business?.staff?.length 
          ? 'All staff active'
          : `${settings?.business?.staff?.length - activeStaff.length} staff inactive`,
        type: 'neutral',
        icon: FiUsers
      },
      {
        id: 'todayRevenue',
        title: 'Today\'s Revenue',
        value: `$${todayAppointments.reduce((total, apt) => {
          const service = settings?.business?.services?.find(s => s.name === apt.service);
          return total + (service?.price || 0);
        }, 0)}`,
        subtext: todayAppointments.filter(apt => apt.status === 'Confirmed').length === 0 
          ? 'No confirmed appointments'
          : `${todayAppointments.filter(apt => apt.status === 'Confirmed').length} confirmed appointments`,
        type: 'neutral',
        icon: FiDollarSign
      }
    ];
  }, [appointments, settings?.business?.staff, settings?.business?.services]);

  const formatTime = (time) => {
    return dayjs(`2000-01-01 ${time}`, 'YYYY-MM-DD HH:mm A').format('h:mm A');
  };

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Attended', label: 'Attended' },
    { value: 'Canceled', label: 'Canceled' }
  ];

  const getStatusLabel = (status) => {
    return statusOptions.find(option => option.value === status)?.label || status;
  };

  const getServiceName = (serviceId) => {
    if (!serviceId) return 'Unknown Service';
    const service = settings?.business?.services?.find(s => s.name === serviceId);
    return service?.name || serviceId;
  };

  const getStaffMemberName = (staffId) => {
    if (!staffId || staffId === 'No preference') return 'No preference';
    const staff = settings?.business?.staff?.find(s => s.name === staffId);
    return staff?.name || staffId;
  };

  const sortAppointments = (appointments) => {
    return appointments.sort((a, b) => {
      // Create full datetime strings for comparison
      const dateTimeA = `${a.date} ${a.time}`;
      const dateTimeB = `${b.date} ${b.time}`;
      
      // Parse into dayjs objects for accurate comparison
      const momentA = dayjs(dateTimeA, 'YYYY-MM-DD HH:mm A');
      const momentB = dayjs(dateTimeB, 'YYYY-MM-DD HH:mm A');
      
      return momentA.diff(momentB);
    });
  };

  const filteredAppointments = useMemo(() => {
    return showAllAppointments ? appointments : upcomingAppointments;
  }, [showAllAppointments, appointments, upcomingAppointments]);

  return (
    <div className="min-h-screen bg-[#1a1f2b]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <img src={"/src/assets/images/ReserveEaseLogoNObg.png"} alt="ReserveEase Logo" className="w-16 h-16 inline-block rotate-6" />
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
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 w-full sm:w-auto"
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
                          <h3 className="text-lg font-semibold text-white">{appointment.clientName}</h3>
                          <p className="text-gray-400 text-sm">
                            {dayjs(appointment.date).format('MMMM D, YYYY')} at {formatTime(appointment.time)}
                          </p>
                          <p className="text-gray-400 text-sm">{appointment.service}</p>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                          <span className="hidden sm:inline text-gray-400">{getStaffMemberName(appointment.staffMember)}</span>
                          <div className="flex items-center gap-2">
                            <AnimatePresence mode="wait">
                              {editingStatus === appointment.id ? (
                                <motion.select
                                  key={`status-select-${appointment.id}`}
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.95 }}
                                  className={`px-3 py-1 rounded-full text-xs bg-[#1a1f2b] border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                                  value={appointment.status}
                                  onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                                  onBlur={() => setEditingStatus(null)}
                                >
                                  {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </motion.select>
                              ) : (
                                <motion.button
                                  key={`status-${appointment.id}-${appointment.status}`}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  onClick={() => setEditingStatus(appointment.id)}
                                  className={`px-3 py-1 rounded-full text-xs ${getStatusColor(appointment.status)}`}
                                >
                                  {getStatusLabel(appointment.status)}
                                </motion.button>
                              )}
                            </AnimatePresence>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleEditAppointment(appointment)}
                                className="text-blue-500 hover:text-blue-400 transition-colors"
                              >
                                <FiEdit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(appointment)}
                                className="text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
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
          onSave={() => {
            setShowNewAppointment(false);
            setAppointmentToEdit(null);
          }}
          appointment={appointmentToEdit}
          existingAppointments={appointments}
        />

        {/* Appointments View Modal */}
        <AppointmentsView
          isOpen={showAllAppointments}
          onClose={() => setShowAllAppointments(false)}
          appointments={appointments}
          onEdit={handleEditAppointment}
          onDelete={handleDeleteClick}
          onStatusChange={handleStatusChange}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
          getStaffMemberName={getStaffMemberName}
        />

        {/* Delete Confirmation Dialog */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <Dialog
              open={showDeleteConfirm}
              onClose={() => setShowDeleteConfirm(false)}
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
                    Delete Appointment
                  </Dialog.Title>
                  <Dialog.Description className="text-gray-300 mb-6">
                    Are you sure you want to delete this appointment?
                  </Dialog.Description>

                  <div className="flex justify-end gap-3">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-500 transition-colors"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-500 transition-colors"
                      onClick={handleConfirmDelete}
                    >
                      Delete
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
