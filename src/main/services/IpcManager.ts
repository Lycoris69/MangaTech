import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { operationLogger } from './OperationLogger';

/**
 * Manager for IPC communications that provides automatic logging and tracking.
 */
export class IpcManager {
    /**
     * Wraps ipcMain.handle with automatic logging and error tracking.
     * 
     * @param channel The IPC channel to handle
     * @param handler The handler function
     */
    static handle(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any): void {
        ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: any[]) => {
            // Create a unique operation name for the logger
            const operationName = `IPC:${channel}`;

            // Sanitize arguments for logging (avoid logging large objects or sensitive data if any)
            const sanitizedArgs = args.map(arg => {
                if (typeof arg === 'string' && arg.length > 500) {
                    return `${arg.substring(0, 500)}... (truncated)`;
                }
                return arg;
            });

            const operationId = operationLogger.startOperation(operationName, { arguments: sanitizedArgs });

            try {
                const result = await handler(event, ...args);

                operationLogger.endOperation(operationId, true);
                return result;
            } catch (error) {
                operationLogger.endOperation(operationId, false, {
                    errorMessage: error instanceof Error ? error.message : String(error)
                });
                throw error; // Re-throw so the renderer can catch it
            }
        });
    }
}
