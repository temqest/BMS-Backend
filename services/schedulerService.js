const cron = require('node-cron');
const { scheduledSendAppointmentAlert } = require('./AppointmentAlert');
const logger = require('../util/logger');

function initScheduler() {

    cron.schedule('0 8 * * *', async () => {
        logger.info('SCHEDULER', 'Running daily appointment reminder check (08:00 AM)...');
        try {
            await scheduledSendAppointmentAlert(0); // Today's appointments
            await scheduledSendAppointmentAlert(1); // Tomorrow (1 day ahead)
            await scheduledSendAppointmentAlert(3); // 3 days ahead
        } catch (error) {
            logger.error('SCHEDULER', 'Error executing scheduled appointment alerts', error);
        }
    }, {
        scheduled: true,
        timezone: "Asia/Manila"
    });

    logger.info('SCHEDULER', 'Background cron scheduler initialized (Daily 8:00 AM Asia/Manila)');
}

module.exports = {
    initScheduler
};
