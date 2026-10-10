import { useState, useMemo } from "react";
import { FiSearch, FiX, FiEdit2, FiTrash2 } from "react-icons/fi";
import dayjs from "dayjs";
import { motion, AnimatePresence } from "framer-motion";

const AppointmentsView = ({
  isOpen,
  onClose,
  appointments,
  onEdit,
  onDelete,
  onStatusChange,
  getStatusColor,
  getStatusLabel,
  getStaffMemberName
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [editingStatus, setEditingStatus] = useState(null);
  const [filters, setFilters] = useState({
    dateRange: "all",
    status: "all",
    staff: "all",
    service: "all",
  });
  const [sortConfig] = useState({
    key: "date",
    direction: "asc",
  });

  // Extract unique values for filters
  const staffMembers = useMemo(() => {
    return [...new Set(appointments.map((apt) => apt.staffMember))];
  }, [appointments]);

  const services = useMemo(() => {
    return [...new Set(appointments.map((apt) => apt.service))];
  }, [appointments]);

  const handleSearch = (value) => {
    setSearchTerm(value);
  };

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => {
        const searchString = `${appointment.clientName} ${appointment.email} ${
          appointment.phone
        } ${appointment.service} ${appointment.staffMember || ""} ${
          appointment.notes || ""
        }`.toLowerCase();

        if (searchTerm && !searchString.includes(searchTerm.toLowerCase())) {
          return false;
        }

        if (
          filters.dateRange !== "all" &&
          !dayjs(appointment.date).isSame(dayjs(), filters.dateRange)
        ) {
          return false;
        }

        if (
          filters.status !== "all" &&
          appointment.status !== filters.status
        ) {
          return false;
        }

        if (
          filters.staff !== "all" &&
          appointment.staffMember !== filters.staff
        ) {
          return false;
        }

        if (
          filters.service !== "all" &&
          appointment.service !== filters.service
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortConfig.key === "date") {
          const dateA = dayjs(`${a.date}T${a.time}`);
          const dateB = dayjs(`${b.date}T${b.time}`);
          return sortConfig.direction === "asc"
            ? dateA.diff(dateB)
            : dateB.diff(dateA);
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (sortConfig.direction === "asc") {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
  }, [appointments, searchTerm, filters, sortConfig]);

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
                    onChange={(e) => handleSearch(e.target.value)}
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
                <option key="pending" value="Pending">Pending</option>
                <option key="attended" value="Attended">Attended</option>
                <option key="canceled" value="Canceled">Canceled</option>
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
              {filteredAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="bg-dark/50 p-4 rounded-lg shadow-md group hover:bg-dark-lighter transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {appointment.clientName}
                      </h3>
                      <p className="text-gray-400">
                        {dayjs(appointment.date).format('MMMM D, YYYY')} at {appointment.time}
                      </p>
                      <p className="text-gray-400">{appointment.service}</p>
                      {appointment.notes && (
                        <p className="text-sm text-gray-500 mt-1">{appointment.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400">
                        {getStaffMemberName(appointment.staffMember)}
                      </span>
                      <div className="flex items-center gap-2">
                        {editingStatus === appointment.id ? (
                          <div className="relative">
                            <select
                              value={appointment.status}
                              onChange={(e) => {
                                onStatusChange(appointment.id, e.target.value);
                                setEditingStatus(null);
                              }}
                              className={`px-3 py-1 rounded text-sm cursor-pointer appearance-none ${getStatusColor(appointment.status)} border border-gray-700`}
                              style={{
                                WebkitAppearance: 'none',
                                MozAppearance: 'none'
                              }}
                            >
                              <option value="Pending" className="bg-dark-700 text-yellow-500">Pending</option>
                              <option value="Attended" className="bg-dark-700 text-green-500">Attended</option>
                              <option value="Canceled" className="bg-dark-700 text-red-500">Canceled</option>
                            </select>
                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingStatus(appointment.id)}
                            className={`px-2 py-1 rounded text-xs cursor-pointer hover:opacity-80 transition-opacity ${getStatusColor(appointment.status)}`}
                          >
                            {getStatusLabel(appointment.status)}
                          </button>
                        )}
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => {
                              onEdit(appointment);
                              onClose();
                            }}
                            className="text-blue-500 hover:text-blue-400 transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDelete(appointment)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
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
