const prisma = require('../util/db');
const send = require('../services/sendProvider');


async function checkForUpcomingAppointment(days_before_appointment) {

    try {

        const today = new Date();

        const targetDay = new Date(today);
        targetDay.setDate(targetDay.getDate() + days_before_appointment);

        const startOfDay = new Date(targetDay);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDay);
        endOfDay.setHours(23, 59, 59, 999);

        const upcoming_appointment = await prisma.appointment.findMany({
            where : {
                appointment_date : {
                    gte : startOfDay,
                    lte : endOfDay
                },
            }, 
            include : {
                user : {
                    select : {
                        email : true,
                        phone_number : true,
                        first_name : true,
                        last_name : true
                    }
                },
                facility : {
                    select : {
                        facility_name : true,
                        address : true
                    }
                }
            }
        });

        return upcoming_appointment;

    } catch (error) {
        throw error;
    }
}

async function sendAppointmentAlert(appointments) {

    try {

        for(let i = 0; i < appointments.length; i++) {

            const app = appointments[i];
            const user = app?.user;

            if (!user) continue;

            const dateObj = new Date(app.appointment_date);

            const formattedDate = dateObj.toLocaleDateString('en-US', {
                year: 'numeric',
                month : 'long',
                day : 'numeric'
            });  

            const formattedTime = dateObj.toLocaleTimeString('en-US', {
                hour : '2-digit',
                minute : '2-digit',
                hour12 : true
            }); 

            const facility_name = app.facility?.facility_name || 'your assigned healthcare facility';

            const message = `Dear ${user.first_name} ${user.last_name}, you have an upcoming appointment at ${facility_name} on ${formattedDate} at ${formattedTime}.`;
            const subject = "Upcoming Appointment Notification";
            
            try {
                if (user.email) {
                    await send.sendEmail(user.email, message, subject);
                } else if (user.phone_number) {
                    await send.sendSMS(user.phone_number, message);
                }
            } catch (sendError) {
                console.error(`Failed to send alert for user ${user.first_name} ${user.last_name}:`, sendError);
            }
        }

    } catch (error) {
        throw error;
    }
}

async function scheduledSendAppointmentAlert(days_before_appointment) {

    try {

        const upcomingAppointment = await checkForUpcomingAppointment(days_before_appointment);

        if (upcomingAppointment.length === 0) {
            console.log(`No upcoming appointments found for ${days_before_appointment} day(s) ahead.`);
            return;
        }

        await sendAppointmentAlert(upcomingAppointment);

        console.log(`Appointment alerts sent successfully for ${days_before_appointment} day(s) ahead.`);

    } catch (error) {
        throw error;
    }

}

module.exports = {
    checkForUpcomingAppointment,
    sendAppointmentAlert,
    scheduledSendAppointmentAlert
};
