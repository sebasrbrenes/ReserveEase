import React from 'react';
import { FiEdit2, FiTrash2 } from 'react-icons/fi';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';
import { FiClock, FiUser, FiMessageSquare } from 'react-icons/fi';
import { format } from 'date-fns';
import { useTime } from '../../context/TimeContext';

const AppointmentCard = ({ appointment, onEdit, onDelete }) => {
  const { currentDate } = useTime();
  const { name, time, service, staffMember, description } = appointment;

  const appointmentTime = new Date(currentDate);
  const [hours, minutes] = time.split(':');
  appointmentTime.setHours(parseInt(hours), parseInt(minutes), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <span className="text-sm text-gray-400">
          {format(appointmentTime, 'h:mm a')}
        </span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center text-gray-400">
          <FiClock className="mr-2" />
          <span>{service}</span>
        </div>

        {staffMember && (
          <div className="flex items-center text-gray-400">
            <FiUser className="mr-2" />
            <span>{staffMember}</span>
          </div>
        )}

        {description && (
          <div className="flex items-start text-gray-400 mt-2">
            <FiMessageSquare className="mr-2 mt-1 flex-shrink-0" />
            <p className="text-sm">{description}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <span className={`px-2 py-1 text-xs rounded-full ${
          appointment.status === 'Confirmed' 
            ? 'bg-green-900/50 text-green-400' 
            : 'bg-yellow-900/50 text-yellow-400'
        }`}>
          {appointment.status === 'Confirmed' ? 'Confirmed' : 'Pending'}
        </span>
        <button
          onClick={onEdit}
          className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-700"
          title="Edit"
        >
          <FiEdit2 className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 text-gray-400 hover:text-red-400 transition-colors rounded-lg hover:bg-gray-700"
          title="Delete"
        >
          <FiTrash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default AppointmentCard;
