const prisma = require('../util/db');
const send = require('../services/sendProvider');
const sendPush = require('../services/pushNotificationService');


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

async function sendAppointmentAlert(appointments, days_before = null) {

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

            const timeString = app.appointment_time || (dateObj.toLocaleTimeString('en-US', {
                hour : '2-digit',
                minute : '2-digit',
                hour12 : true
            }));

            const facility_name = app.facility?.facility_name || 'your assigned healthcare facility';

            let timingText = `on ${formattedDate} at ${timeString}`;
            let subject = "Upcoming Appointment Notification";

            if (days_before === 0) {
                timingText = `TODAY (${formattedDate}) at ${timeString}`;
                subject = "Reminder: You Have an Appointment Today!";
            } else if (days_before === 1) {
                timingText = `TOMORROW (${formattedDate}) at ${timeString}`;
                subject = "Reminder: You Have an Appointment Tomorrow!";
            } else if (days_before !== null && days_before > 1) {
                subject = `Reminder: Appointment in ${days_before} Days`;
            }

            const message = `Dear ${user.first_name} ${user.last_name}, this is a reminder for your ${app.appointment_type || 'appointment'} at ${facility_name} scheduled for ${timingText}.`;
            
            if (app.user_id) {
                sendPush.sendNotificationToUser(app.user_id, subject, message, {
                    appointment_id: app.appointment_id,
                    type: 'appointment_reminder'
                }).catch(pushErr => console.error(`[AppointmentAlert] Failed to send push alert:`, pushErr));
            }

            try {
                if (user.email) {
                    await send.sendEmail(user.email, message, subject);
                } else if (user.phone_number) {
                    await send.sendSMS(user.phone_number, message);
                }
            } catch (sendError) {
                console.error(`Failed to send email/SMS alert for user ${user.first_name} ${user.last_name}:`, sendError);
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
            const dayLabel = days_before_appointment === 0 ? 'today' : `${days_before_appointment} day(s) ahead`;
            console.log(`No upcoming appointments found for ${dayLabel}.`);
            return;
        }

        await sendAppointmentAlert(upcomingAppointment, days_before_appointment);

        const dayLabel = days_before_appointment === 0 ? 'today' : `${days_before_appointment} day(s) ahead`;
        console.log(`Appointment alerts sent successfully for ${dayLabel}.`);

    } catch (error) {
        throw error;
    }

}

module.exports = {
    checkForUpcomingAppointment,
    sendAppointmentAlert,
    scheduledSendAppointmentAlert
};
