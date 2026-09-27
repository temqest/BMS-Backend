// Terminal color codes (ANSI)
const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    italic: '\x1b[3m',
    underline: '\x1b[4m',

    // Foreground colors
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',

    // Bright colors
    brightRed: '\x1b[91m',
    brightGreen: '\x1b[92m',
    brightYellow: '\x1b[93m',
    brightBlue: '\x1b[94m',
    brightMagenta: '\x1b[95m',
    brightCyan: '\x1b[96m',
    brightWhite: '\x1b[97m',

    // Background colors
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
};

function getTimestamp() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function getMethodBadge(method) {
    switch (method.toUpperCase()) {
        case 'GET':
            return `${colors.bold}${colors.brightCyan} GET    ${colors.reset}`;
        case 'POST':
            return `${colors.bold}${colors.brightGreen} POST   ${colors.reset}`;
        case 'PUT':
            return `${colors.bold}${colors.brightYellow} PUT    ${colors.reset}`;
        case 'PATCH':
            return `${colors.bold}${colors.yellow} PATCH  ${colors.reset}`;
        case 'DELETE':
            return `${colors.bold}${colors.brightRed} DELETE ${colors.reset}`;
        case 'OPTIONS':
            return `${colors.gray} OPT    ${colors.reset}`;
        default:
            return `${colors.white} ${method.padEnd(6)} ${colors.reset}`;
    }
}

function getStatusBadge(status) {
    if (status >= 500) {
        return `${colors.bold}${colors.bgRed}${colors.brightWhite} ${status} ERR ${colors.reset}`;
    } else if (status >= 400) {
        return `${colors.bold}${colors.brightYellow} ${status} WARN ${colors.reset}`;
    } else if (status >= 300) {
        return `${colors.cyan} ${status} REDR ${colors.reset}`;
    } else if (status >= 200) {
        return `${colors.brightGreen} ${status} OK   ${colors.reset}`;
    }
    return `${colors.white} ${status}      ${colors.reset}`;
}

function getActionTag(url) {
    const cleanUrl = url.split('?')[0];

    const routeMappings = [
        { pattern: /^\/api\/v1\/auth\/login/, tag: '🔐 Auth:Login' },
        { pattern: /^\/api\/v1\/auth\/register/, tag: '📝 Auth:Register' },
        { pattern: /^\/api\/v1\/auth\/me/, tag: '👤 Auth:Profile' },
        { pattern: /^\/api\/v1\/auth\/send-otp/, tag: '📲 Auth:SendOTP' },
        { pattern: /^\/api\/v1\/auth\/verify-otp/, tag: '🔑 Auth:VerifyOTP' },
        { pattern: /^\/api\/v1\/auth\/refresh/, tag: '🔄 Auth:Refresh' },
        { pattern: /^\/api\/v1\/auth/, tag: '🔐 Auth' },
        { pattern: /^\/api\/v1\/mother\/search/, tag: '🔍 Mother:Search' },
        { pattern: /^\/api\/v1\/mother/, tag: '🤰 Mother' },
        { pattern: /^\/api\/v1\/pregnancy/, tag: '👶 Pregnancy' },
        { pattern: /^\/api\/v1\/prenatal-visit/, tag: '🩺 Prenatal' },
        { pattern: /^\/api\/v1\/postpartum-visit/, tag: '🌸 Postpartum' },
        { pattern: /^\/api\/v1\/supplement/, tag: '💊 Supplement' },
        { pattern: /^\/api\/v1\/lab-screening/, tag: '🧪 LabScreen' },
        { pattern: /^\/api\/v1\/delivery-outcome/, tag: '🏥 Delivery' },
        { pattern: /^\/api\/v1\/newborn-record/, tag: '🍼 Newborn' },
        { pattern: /^\/api\/v1\/ehr/, tag: '📋 EHR' },
        { pattern: /^\/api\/v1\/cdss/, tag: '🧠 CDSS:Risk' },
        { pattern: /^\/api\/v1\/referral/, tag: '🚑 Referral' },
        { pattern: /^\/api\/v1\/appointment/, tag: '📅 Appointment' },
        { pattern: /^\/api\/v1\/notification/, tag: '🔔 Notification' },
        { pattern: /^\/api\/v1\/message/, tag: '💬 Message' },
        { pattern: /^\/api\/v1\/audit-trail/, tag: '📜 Audit' },
        { pattern: /^\/api\/v1\/facility/, tag: '🏢 Facility' },
        { pattern: /^\/api\/v1\/user/, tag: '👥 User' },
        { pattern: /^\/api\/users/, tag: '👥 User' },
        { pattern: /^\/api\/v1\/send/, tag: '📨 Send' },
        { pattern: /^\/api\/v1\/share/, tag: '🔗 Share' },
        { pattern: /^\/health/, tag: '💓 Health' },
        { pattern: /^\/api\/v1\/health/, tag: '💓 Health' },
    ];

    for (const mapping of routeMappings) {
        if (mapping.pattern.test(cleanUrl)) {
            return mapping.tag;
        }
    }

    return '🌐 API';
}

function formatDuration(ms) {
    if (ms < 50) {
        return `${colors.dim}${ms}ms${colors.reset}`;
    } else if (ms < 300) {
        return `${colors.yellow}${ms}ms${colors.reset}`;
    } else {
        return `${colors.brightRed}${colors.bold}${ms}ms${colors.reset}`;
    }
}

function getUserBadge(user) {
    if (!user) return '';
    const role = user.role ? ` (${user.role})` : '';
    const id = user.user_id || user.userId || user.id || '';
    const name = user.email || user.username || (id ? `ID:${id}` : '');
    return `${colors.dim}• User: ${colors.cyan}${name}${role}${colors.reset}`;
}

const logger = {
    info(tag, message, ...meta) {
        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        const tagStr = `${colors.brightCyan}[${tag}]${colors.reset}`;
        console.log(`${time} ℹ️  ${tagStr} ${message}`, ...meta);
    },

    success(tag, message, ...meta) {
        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        const tagStr = `${colors.brightGreen}[${tag}]${colors.reset}`;
        console.log(`${time} ✅ ${tagStr} ${message}`, ...meta);
    },

    warn(tag, message, ...meta) {
        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        const tagStr = `${colors.brightYellow}[${tag}]${colors.reset}`;
        console.warn(`${time} ⚠️  ${tagStr} ${message}`, ...meta);
    },

    error(tag, message, error) {
        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        const tagStr = `${colors.bgRed}${colors.brightWhite} [${tag}] ${colors.reset}`;
        console.error(`\n${colors.brightRed}┌─────────────────────────────────────────────────────────────${colors.reset}`);
        console.error(`${colors.brightRed}│ ❌ ${tagStr} ${colors.bold}${message}${colors.reset}`);
        if (error) {
            if (error.stack) {
                const stackLines = error.stack.split('\n').slice(0, 6);
                console.error(`${colors.brightRed}│${colors.reset} ${colors.gray}${stackLines.join('\n│ ')}${colors.reset}`);
            } else {
                console.error(`${colors.brightRed}│${colors.reset} Details:`, error);
            }
        }
        console.error(`${colors.brightRed}└─────────────────────────────────────────────────────────────${colors.reset}\n`);
    },

    action(actionName, details = '') {
        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        console.log(`${time} ⚡ ${colors.brightMagenta}${colors.bold}[ACTION]${colors.reset} ${actionName} ${details ? `${colors.dim}${details}${colors.reset}` : ''}`);
    },

    request(req, res, durationMs) {
        // Skip spamming logs for static file uploads or silent health pings if desired, but keep API logs clear
        if (req.originalUrl.startsWith('/uploads/')) return;

        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        const methodBadge = getMethodBadge(req.method);
        const statusBadge = getStatusBadge(res.statusCode);
        const actionTag = `${colors.bold}${colors.magenta}[${getActionTag(req.originalUrl)}]${colors.reset}`;
        const duration = formatDuration(durationMs);
        const userBadge = getUserBadge(req.user);

        const url = `${colors.white}${req.originalUrl}${colors.reset}`;

        console.log(`${time} ${methodBadge} ${statusBadge} ${duration.padEnd(14)} ${actionTag} ${url} ${userBadge}`);
    },

    serverError(err, req) {
        const time = `${colors.gray}[${getTimestamp()}]${colors.reset}`;
        const actionTag = getActionTag(req.originalUrl);
        const userBadge = getUserBadge(req.user);

        console.error(`\n${colors.brightRed}┌─────────────────────────────────────────────────────────────────────────────${colors.reset}`);
        console.error(`${colors.brightRed}│ ❌ SERVER ERROR (${err.status || 500}) on ${req.method} ${req.originalUrl}${colors.reset}`);
        console.error(`${colors.brightRed}│ Action: [${actionTag}] ${userBadge}${colors.reset}`);
        console.error(`${colors.brightRed}│ Message: ${colors.bold}${err.message || err}${colors.reset}`);
        if (err.stack) {
            const stackLines = err.stack.split('\n').slice(1, 8);
            console.error(`${colors.brightRed}│ Stack:${colors.reset}\n${colors.gray}│   ${stackLines.join('\n│   ')}${colors.reset}`);
        }
        console.error(`${colors.brightRed}└─────────────────────────────────────────────────────────────────────────────${colors.reset}\n`);
    }
};

module.exports = logger;
