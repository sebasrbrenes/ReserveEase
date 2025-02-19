import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
  orderBy,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import dayjs from 'dayjs';

const appointmentsRef = collection(db, 'appointments');

// Function for client-side appointment booking
export const addAppointment = async (appointmentData) => {
  console.log('Creating client appointment with data:', appointmentData);
  try {
    // Ensure dates are properly formatted
    const formattedData = {
      ...appointmentData,
      date: dayjs(appointmentData.date).format('YYYY-MM-DD'),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
      userId: appointmentData.businessId
    };

    // Verify the time slot is still available
    const existingAppointments = await getDocs(
      query(
        appointmentsRef,
        where('staffMember', '==', appointmentData.staffMember),
        where('date', '==', formattedData.date),
        where('status', '!=', 'Cancelled')
      )
    );

    const isTimeSlotTaken = existingAppointments.docs.some(doc => {
      const apt = doc.data();
      return apt.time === appointmentData.time;
    });

    if (isTimeSlotTaken) {
      throw new Error('This time slot is no longer available');
    }
    
    const docRef = await addDoc(appointmentsRef, formattedData);
    console.log('Created client appointment with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// Individual function exports
export const createAppointment = async (appointmentData, userId) => {
  console.log('Creating appointment with data:', appointmentData);
  try {
    const formattedData = {
      ...appointmentData,
      date: dayjs(appointmentData.date).format('YYYY-MM-DD'),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString(),
      userId,
      businessId: userId,
      createdBy: userId
    };

    // Verify time slot availability
    const existingAppointments = await getDocs(
      query(
        appointmentsRef,
        where('staffMember', '==', appointmentData.staffMember),
        where('date', '==', formattedData.date),
        where('status', '!=', 'Cancelled')
      )
    );

    const isTimeSlotTaken = existingAppointments.docs.some(doc => {
      const apt = doc.data();
      return apt.time === appointmentData.time;
    });

    if (isTimeSlotTaken) {
      throw new Error('This time slot is no longer available');
    }

    const docRef = await addDoc(appointmentsRef, formattedData);
    console.log('Created appointment with ID:', docRef.id);
    return docRef;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

export const updateAppointment = async (id, appointmentData, userId) => {
  try {
    const formattedData = {
      ...appointmentData,
      date: dayjs(appointmentData.date).format('YYYY-MM-DD'),
      updatedAt: dayjs().toISOString(),
      updatedBy: userId
    };

    // Verify time slot availability (excluding current appointment)
    const existingAppointments = await getDocs(
      query(
        appointmentsRef,
        where('staffMember', '==', appointmentData.staffMember),
        where('date', '==', formattedData.date),
        where('status', '!=', 'Cancelled')
      )
    );

    const isTimeSlotTaken = existingAppointments.docs.some(doc => {
      if (doc.id === id) return false; // Skip current appointment
      const apt = doc.data();
      return apt.time === appointmentData.time;
    });

    if (isTimeSlotTaken) {
      throw new Error('This time slot is no longer available');
    }

    const appointmentRef = doc(appointmentsRef, id);
    await updateDoc(appointmentRef, formattedData);
    return { success: true };
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

export const updateAppointmentStatus = async (id, status, userId) => {
  const appointmentRef = doc(db, 'appointments', id);
  const appointmentSnap = await getDocs(query(appointmentsRef, where('userId', '==', userId)));
  if (appointmentSnap.empty) {
    throw new Error('Appointment not found or unauthorized');
  }

  console.log('Updating appointment status:', id, status);
  try {
    await updateDoc(appointmentRef, {
      status,
      updatedAt: dayjs().valueOf()
    });

    return { success: true };
  } catch (error) {
    console.error('Error updating appointment status:', error);
    throw error;
  }
};

export const deleteAppointment = async (id, userId) => {
  // First verify the appointment belongs to this user
  const appointmentRef = doc(db, 'appointments', id);
  const appointmentSnap = await getDocs(query(appointmentsRef, where('userId', '==', userId)));
  if (appointmentSnap.empty) {
    throw new Error('Appointment not found or unauthorized');
  }

  console.log('Deleting appointment with ID:', id);
  await deleteDoc(appointmentRef);
  console.log('Deleted appointment with ID:', id);
};

export const getAppointments = async (startDate, endDate, userId) => {
  try {
    if (!userId) {
      console.error('No user ID provided for getAppointments');
      return [];
    }
    console.log('Fetching appointments between:', startDate, 'and', endDate, 'for user:', userId);
    
    // Query appointments by userId
    const q = query(
      appointmentsRef,
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );
    
    console.log('Executing Firestore query with params:', {
      userId,
      startDate,
      endDate,
      queryString: q.toString()
    });
    
    const snapshot = await getDocs(q);
    console.log('Query returned', snapshot.size, 'documents');
    
    const appointments = snapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Document data:', { id: doc.id, ...data });
      return {
        id: doc.id,
        ...data
      };
    });
    
    // Filter dates in memory
    const filteredAppointments = appointments.filter(apt => {
      const aptDate = dayjs(apt.date).format('YYYY-MM-DD');
      return aptDate >= startDate && aptDate <= endDate;
    });
    
    console.log('Filtered appointments:', filteredAppointments);
    const sortedAppointments = sortAppointments(filteredAppointments);
    console.log('Appointments after sorting:', sortedAppointments);
    
    return sortedAppointments;
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }
};

export const getUpcomingAppointments = async (currentDate, userId) => {
  try {
    console.log('Getting upcoming appointments from date:', currentDate, 'for user:', userId);
    const q = query(
      appointmentsRef,
      where('userId', '==', userId),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);
    const appointments = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Filter future appointments in memory
    const futureAppointments = appointments.filter(apt => {
      const aptDate = dayjs(apt.date).format('YYYY-MM-DD');
      return aptDate >= currentDate;
    });

    return sortAppointments(futureAppointments);
  } catch (error) {
    console.error('Error getting upcoming appointments:', error);
    return [];
  }
};

const sortAppointments = (appointments) => {
  return appointments.sort((a, b) => {
    const dateA = dayjs(`${a.date}T${a.time}`);
    const dateB = dayjs(`${b.date}T${b.time}`);
    return dateA.diff(dateB);
  });
};

// Export the service object for backward compatibility
export const appointmentsService = {
  add: addAppointment,
  create: createAppointment,
  update: updateAppointment,
  delete: deleteAppointment,
  get: getAppointments,
  getUpcoming: getUpcomingAppointments,
  updateStatus: updateAppointmentStatus
};
