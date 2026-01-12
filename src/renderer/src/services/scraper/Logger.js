"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    constructor(context) {
        this.context = context;
    }
    debug(message, meta) {
        this.log(LogLevel.DEBUG, message, meta);
    }
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    error(message, meta) {
        this.log(LogLevel.ERROR, message, meta);
    }
    log(level, message, meta) {
        // In production/mobile, we might want to disable DEBUG logs
        // const isProduction = process.env.NODE_ENV === 'production';
        // if (isProduction && level === LogLevel.DEBUG) return;
        const timestamp = new Date().toISOString();
        const formattedMessage = `[${timestamp}] [${this.context}] ${message}`;
        switch (level) {
            case LogLevel.DEBUG:
                console.debug(formattedMessage, meta || '');
                break;
            case LogLevel.INFO:
                console.info(formattedMessage, meta || '');
                break;
            case LogLevel.WARN:
                console.warn(formattedMessage, meta || '');
                break;
            case LogLevel.ERROR:
                console.error(formattedMessage, meta || '');
                break;
        }
    }
    static create(context) {
        return new Logger(context);
    }
}
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map