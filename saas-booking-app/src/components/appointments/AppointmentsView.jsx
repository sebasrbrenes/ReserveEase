import { useState, useMemo } from "react";
import { FiSearch, FiX, FiEdit2, FiXCircle } from "react-icons/fi";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import { STATUS, STATUS_ACTIONS, statusClass, statusLabel } from "./status";
import { formatLocalDate, formatTime } from "../../utils/datetime";
import NotificationStatus from "./NotificationStatus";

const AppointmentsView = ({
  isOpen,
  onClose,
  appointments,
  timezone,
  onEdit,
  onCancel,
  onStatusChange,
  onRetryEmail,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStatus, setEditingStatus] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: "all",
    status: "all",
    staff: "all",
    service: "all",
  });

  // Extract unique values for filters
  const staffMembers = useMemo(() => {
    return [...new Set(appointments.map((apt) => apt.staffSnapshot?.displayName).filter(Boolean))];
  }, [appointments]);

  const services = useMemo(() => {
    return [...new Set(appointments.map((apt) => apt.serviceSnapshot?.name).filter(Boolean))];
  }, [appointments]);

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const searchString = `${appointment.client?.name} ${appointment.client?.email} ${
        appointment.client?.phoneE164 || ""
      } ${appointment.serviceSnapshot?.name} ${appointment.staffSnapshot?.displayName || ""} ${
        appointment.notes || ""
      }`.toLowerCase();

      if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) return false;
      if (filters.dateRange !== "all" && !dayjs(appointment.localDate).isSame(dayjs(), filters.dateRange)) return false;
      if (filters.status !== "all" && appointment.status !== filters.status) return false;
      if (filters.staff !== "all" && appointment.staffSnapshot?.displayName !== filters.staff) return false;
      if (filters.service !== "all" && appointment.serviceSnapshot?.name !== filters.service) return false;
      return true;
    });
  }, [appointments, searchTerm, filters]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-start justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative bg-dark-lighter rounded-lg shadow-xl w-full max-w-4xl p-6 my-8"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                All Appointments
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <FiX className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-wrap gap-4 mb-6 bg-dark-lighter p-4 rounded-lg border border-gray-700">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by client name, email, or phone..."
                    className="w-full bg-dark-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <select
                className="bg-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 appearance-none"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              >
                <option key="all" value="all">All Dates</option>
                <option key="today" value="day">Today</option>
                <option key="week" value="week">This Week</option>
                <option key="month" value="month">This Month</option>
              </select>

              <select
                className="bg-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 appearance-none"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option key="all" value="all">All Statuses</option>
                {Object.entries(STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                className="bg-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 appearance-none"
                value={filters.staff}
                onChange={(e) => handleFilterChange("staff", e.target.value)}
              >
                <option key="all" value="all">All Staff</option>
                {staffMembers.map((staff) => (
                  <option key={staff} value={staff}>
                    {staff}
                  </option>
                ))}
              </select>

              <select
                className="bg-dark-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-700 appearance-none"
                value={filters.service}
                onChange={(e) => handleFilterChange("service", e.target.value)}
              >
                <option key="all" value="all">All Services</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {filteredAppointments.length === 0 && (
                <p className="text-gray-400">No appointments match these filters.</p>
              )}
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-dark/50 p-4 rounded-lg shadow-md group hover:bg-dark-lighter transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {appointment.client?.name}
                      </h3>
                      <p className="text-gray-400">
                        {formatLocalDate(appointment.localDate, { month: 'long', day: 'numeric', year: 'numeric' })} at {formatTime(appointment.startsAt, timezone)}
                      </p>
                      <p className="text-gray-400">{appointment.serviceSnapshot?.name}</p>
                      <p className="text-sm text-gray-500">
                        {[appointment.client?.email, appointment.client?.phoneE164].filter(Boolean).join(' · ')}
                      </p>
                      {appointment.notes && (
                        <p className="text-sm text-gray-500 mt-1">{appointment.notes}</p>
                      )}
                      <NotificationStatus notification={appointment.notification} onRetry={() => onRetryEmail(appointment)} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">
                        {appointment.staffSnapshot?.displayName}
                      </span>
                      <div className="flex items-center gap-2">
                        {editingStatus === appointment.id ? (
                          <select
                            autoFocus
                            aria-label="Change status"
                            value=""
                            onChange={(e) => {
                              onStatusChange(appointment, e.target.value);
                              setEditingStatus(null);
                            }}
                            onBlur={() => setEditingStatus(null)}
                            className="px-3 py-1 rounded text-sm cursor-pointer bg-dark-700 text-white border border-gray-700"
                          >
                            <option value="">{statusLabel(appointment.status)}</option>
                            {STATUS_ACTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => appointment.status === 'confirmed' && setEditingStatus(appointment.id)}
                            className={`px-2 py-1 rounded text-xs ${appointment.status === 'confirmed' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity ${statusClass(appointment.status)}`}
                          >
                            {statusLabel(appointment.status)}
                          </button>
                        )}
                        <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              onEdit(appointment);
                              onClose();
                            }}
                            className="text-blue-500 hover:text-blue-400 transition-colors"
                            aria-label="Edit appointment"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => onCancel(appointment)}
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
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AppointmentsView;
