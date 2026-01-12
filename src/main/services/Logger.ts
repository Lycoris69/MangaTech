/**
 * Simple logger for the renderer process with consistent formatting.
 */
export class Logger {
    private static format(level: string, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    static debug(message: string, ...args: any[]): void {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.format('debug', message), ...args);
        }
    }

    static info(message: string, ...args: any[]): void {
        console.info(this.format('info', message), ...args);
    }

    static warn(message: string, ...args: any[]): void {
        console.warn(this.format('warn', message), ...args);
    }

    static error(message: string, ...args: any[]): void {
        console.error(this.format('error', message), ...args);
    }
}
