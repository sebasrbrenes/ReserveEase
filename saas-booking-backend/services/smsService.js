import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

// Constants
const TWILIO_MIN_SECONDS = 300;
const SAFE_BUFFER_SECONDS = 60;
const MIN_SCHEDULE_SECONDS = TWILIO_MIN_SECONDS + SAFE_BUFFER_SECONDS;
const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * Get the appropriate timezone for the current context
 * @param {string} [businessTimezone] Optional business-specific timezone
 * @returns {string} Valid IANA timezone string
 */
function getTimezone(businessTimezone) {
    // Priority order:
    // 1. Business-specific timezone (for future use)
    // 2. Environment variable
    // 3. System timezone
    // 4. Fallback default
    
    try {
        // Check if a business timezone is provided (for future use)
        if (businessTimezone && Intl.DateTimeFormat().resolvedOptions().timeZones?.includes(businessTimezone)) {
            return businessTimezone;
        }

        // Check environment variable
        if (process.env.DEFAULT_TIMEZONE) {
            // Validate the timezone is valid
            new Intl.DateTimeFormat('en-US', { timeZone: process.env.DEFAULT_TIMEZONE });
            return process.env.DEFAULT_TIMEZONE;
        }

        // Use system timezone if available
        const systemTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (systemTimezone) {
            return systemTimezone;
        }

        // Fallback to a safe default
        return 'America/Costa_Rica';
    } catch (error) {
        console.warn('Invalid timezone configuration, falling back to America/Costa_Rica:', error.message);
        return 'America/Costa_Rica';
    }
}

function formatPhoneNumber(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }
    if (cleaned.length >= 11) {
        return `+${cleaned}`;
    }
    throw new Error('Invalid phone number format. Must be at least 10 digits.');
}

function createLocalDate(dateStr, timeStr) {
    // Parse date components
    const [year, month, day] = dateStr.split('-').map(num => parseInt(num));
    
    // Parse time components
    let hours = 0;
    let minutes = 0;
    
    if (timeStr.includes('AM') || timeStr.includes('PM')) {
        const [timePart, meridiem] = timeStr.split(' ');
        [hours, minutes] = timePart.split(':').map(num => parseInt(num));
        
        if (meridiem === 'PM' && hours !== 12) {
            hours += 12;
        } else if (meridiem === 'AM' && hours === 12) {
            hours = 0;
        }
    } else {
        [hours, minutes] = timeStr.split(':').map(num => parseInt(num));
    }

    // Create date object
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

async function sendSMS(phone, clientName, businessName, date, time, businessTimezone) {
    console.log('Received date and time:', { date, time });

    try {
        const formattedPhone = formatPhoneNumber(phone);
        const now = new Date();
        const timezone = getTimezone(businessTimezone);
        
        // Create the appointment date in local time
        const appointmentDate = createLocalDate(date, time);
        
        // Calculate time until appointment
        const timeUntilAppointment = appointmentDate.getTime() - now.getTime();
        
        // Calculate reminder time
        let reminderDate;
        
        if (timeUntilAppointment <= MIN_SCHEDULE_SECONDS * 1000) {
            throw new Error(`Appointment is too soon. Must be at least ${Math.ceil(MIN_SCHEDULE_SECONDS / 60)} minutes in the future`);
        } else if (timeUntilAppointment <= TWENTY_FOUR_HOURS) {
            reminderDate = new Date(now.getTime() + (MIN_SCHEDULE_SECONDS * 1000));
        } else {
            reminderDate = new Date(appointmentDate.getTime() - TWENTY_FOUR_HOURS);
            
            if (reminderDate.getTime() - now.getTime() < MIN_SCHEDULE_SECONDS * 1000) {
                reminderDate = new Date(now.getTime() + (MIN_SCHEDULE_SECONDS * 1000));
            }
        }

        // Format dates using the determined timezone
        function formatDateTime(date) {
            if (!(date instanceof Date) || isNaN(date)) {
                return 'Invalid Date';
            }
            return date.toLocaleString('en-US', {
                timeZone: timezone,
                dateStyle: 'medium',
                timeStyle: 'medium'
            });
        }

        console.log('Debug dates:', {
            originalDate: date,
            originalTime: time,
            currentTime: formatDateTime(now),
            appointmentTime: formatDateTime(appointmentDate),
            reminderTime: formatDateTime(reminderDate),
            timeUntilAppointment: Math.floor(timeUntilAppointment / (60 * 1000)) + ' minutes',
            timeUntilReminder: Math.floor((reminderDate.getTime() - now.getTime()) / (60 * 1000)) + ' minutes',
            minimumAllowedMinutes: Math.ceil(MIN_SCHEDULE_SECONDS / 60),
            timezone: timezone
        });

        const messageBody = `Reminder! ${clientName}, you have an appointment at ${businessName} tomorrow at ${time}.`;
        
        // Verify phone number
        try {
            await client.lookups.v2.phoneNumbers(formattedPhone).fetch();
        } catch (lookupError) {
            throw new Error(`Invalid phone number: ${lookupError.message}`);
        }

        const message = await client.messages.create({
            body: messageBody,
            messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
            scheduleType: "fixed",
            sendAt: reminderDate.toISOString(),
            to: formattedPhone
        });

        console.log("SMS Scheduling Details:", {
            messageSid: message.sid,
            messageBody: message.body,
            scheduledFor: formatDateTime(reminderDate),
            phoneNumber: formattedPhone,
            timeUntilSend: Math.floor((reminderDate.getTime() - now.getTime()) / (60 * 1000)) + ' minutes'
        });
        
        return message;
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
}

export default { sendSMS };
