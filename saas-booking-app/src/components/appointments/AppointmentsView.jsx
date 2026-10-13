import { useState, useMemo } from "react";
import { FiSearch, FiX, FiEdit2, FiXCircle } from "react-icons/fi";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";
import { STATUS, statusActionsFor, statusClass, statusLabel } from "./status";
import { formatLocalDate, formatTime } from "../../utils/datetime";
import NotificationStatus from "./NotificationStatus";
import { Scribble } from "../ui/Doodles";

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
          className="fixed inset-0 bg-ink/40 flex items-start justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="relative hd-card w-full max-w-4xl p-4 sm:p-6 my-8 text-ink"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="hd-title text-4xl">
                All Appointments
              </h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-1 text-ink-soft hover:text-ink hover:bg-paper-deep rounded-full transition-colors"
              >
                <FiX className="w-6 h-6" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 mb-5 bg-paper p-3 sm:p-4 rounded-xl border-2 border-dashed border-ink-soft/50">
              <div className="w-full sm:flex-1 sm:min-w-[200px]">
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" aria-hidden="true" />
                  <input
                    type="text"
                    aria-label="Search appointments"
                    placeholder="Search by client name, email, or phone..."
                    className="hd-input !mt-0 pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <select
                aria-label="Filter by date"
                className="hd-input !mt-0 flex-1 min-w-[140px] sm:flex-none sm:w-auto"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange("dateRange", e.target.value)}
              >
                <option key="all" value="all">All Dates</option>
                <option key="today" value="day">Today</option>
                <option key="week" value="week">This Week</option>
                <option key="month" value="month">This Month</option>
              </select>

              <select
                aria-label="Filter by status"
                className="hd-input !mt-0 flex-1 min-w-[140px] sm:flex-none sm:w-auto"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              >
                <option key="all" value="all">All Statuses</option>
                {Object.entries(STATUS).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>

              <select
                aria-label="Filter by staff"
                className="hd-input !mt-0 flex-1 min-w-[140px] sm:flex-none sm:w-auto"
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
                aria-label="Filter by service"
                className="hd-input !mt-0 flex-1 min-w-[140px] sm:flex-none sm:w-auto"
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

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
              {filteredAppointments.length === 0 && (
                <div className="text-center py-8">
                  <Scribble className="mx-auto w-24 h-10 text-sun mb-2" />
                  <p className="text-ink-soft">No appointments match these filters.</p>
                </div>
              )}
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-paper p-4 rounded-xl border-2 border-ink-soft/30 group hover:border-ink transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3">
                    <div className="min-w-0 break-words">
                      <h3 className="text-lg font-bold text-ink">
                        {appointment.client?.name}
                      </h3>
                      <p className="text-ink">
                        {formatLocalDate(appointment.localDate, { month: 'long', day: 'numeric', year: 'numeric' })} at {formatTime(appointment.startsAt, timezone)}
                      </p>
                      <p className="text-ink-soft">{appointment.serviceSnapshot?.name}</p>
                      <p className="text-sm text-ink-soft">
                        {[appointment.client?.email, appointment.client?.phoneE164].filter(Boolean).join(' · ')}
                      </p>
                      {appointment.notes && (
                        <p className="text-sm text-ink-soft mt-1 italic">{appointment.notes}</p>
                      )}
                      <NotificationStatus notification={appointment.notification} onRetry={() => onRetryEmail(appointment)} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0">
                      <span className="text-ink-soft">
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
                            className="hd-input !mt-0 !w-auto !py-1 text-sm cursor-pointer"
                          >
                            <option value="">{statusLabel(appointment.status)}</option>
                            {statusActionsFor(appointment).map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        ) : (
                          <button
                            onClick={() => appointment.status === 'confirmed' && setEditingStatus(appointment.id)}
                            className={`hd-badge ${appointment.status === 'confirmed' ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity ${statusClass(appointment.status)}`}
                          >
                            {statusLabel(appointment.status)}
                          </button>
                        )}
                        <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              onEdit(appointment);
                              onClose();
                            }}
                            className="p-1.5 rounded-lg text-marker hover:bg-marker-light transition-colors"
                            aria-label="Edit appointment"
                          >
                            <FiEdit2 className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {appointment.status === 'confirmed' && (
                            <button
                              onClick={() => onCancel(appointment)}
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
