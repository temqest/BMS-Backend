const cron = require('node-cron');
const { scheduledSendAppointmentAlert } = require('./AppointmentAlert');

function initScheduler() {

    cron.schedule('0 8 * * *', async () => {
        console.log('[Scheduler] Running daily appointment reminder check (08:00 AM)...');
        try {
            await scheduledSendAppointmentAlert(1);
            await scheduledSendAppointmentAlert(3);
        } catch (error) {
            console.error('[Scheduler] Error executing scheduled appointment alerts:', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Manila"
    });

    console.log('[Scheduler] Background cron scheduler initialized successfully (Daily 8:00 AM Asia/Manila).');
}

module.exports = {
    initScheduler
};
