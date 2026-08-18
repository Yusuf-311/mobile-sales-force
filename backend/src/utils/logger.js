'use strict';

const fs = require('fs');
const path = require('path');

class Logger {
    constructor(logDir) {
        this.logDir = logDir || path.join(__dirname, '../../logs');
        this.activityLogPath = path.join(this.logDir, 'activity.log');
        this.errorLogPath = path.join(this.logDir, 'error.log');
        this.ensureDirectory();
    }

    ensureDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        
        // Handle Error objects in meta
        const safeMeta = {};
        for (const [key, value] of Object.entries(meta)) {
            if (value instanceof Error) {
                safeMeta[key] = { message: value.message, stack: value.stack };
            } else {
                safeMeta[key] = value;
            }
        }
        
        // Circular reference safe stringify
        let metaString = '';
        if (Object.keys(safeMeta).length) {
            try {
                metaString = ` | Meta: ${JSON.stringify(safeMeta)}`;
            } catch (e) {
                metaString = ` | Meta: [Unserializable data]`;
            }
        }
        
        return `[${timestamp}] [${level}] ${message}${metaString}\n`;
    }

    writeLog(filePath, message) {
        try {
            fs.appendFileSync(filePath, message);
        } catch (err) {
            if (process.env.NODE_ENV !== 'test') {
                console.error('Failed to write log:', err);
            }
        }
    }

    info(message, meta = {}) {
        const formatted = this.formatMessage('INFO', message, meta);
        if (process.env.NODE_ENV !== 'test') console.log(formatted.trim());
        this.writeLog(this.activityLogPath, formatted);
    }

    error(message, meta = {}) {
        const formatted = this.formatMessage('ERROR', message, meta);
        if (process.env.NODE_ENV !== 'test') console.error(formatted.trim());
        this.writeLog(this.errorLogPath, formatted);
    }
}

module.exports = new Logger();
module.exports.Logger = Logger; // Exported for testing purposes
