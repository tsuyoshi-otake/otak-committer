import * as vscode from 'vscode';

/**
 * Log levels for the Logger
 */
export enum LogLevel {
    Debug = 0,
    Info = 1,
    Warning = 2,
    Error = 3
}

/**
 * Singleton Logger class that provides unified logging interface
 * for the extension. Logs to both VS Code output channel and console.
 */
export class Logger {
    private static instance: Logger;
    private outputChannel: vscode.OutputChannel;
    private logLevel: LogLevel = LogLevel.Info;
    
    private constructor() {
        this.outputChannel = vscode.window.createOutputChannel('otak-committer');
    }
    
    /**
     * Get the singleton instance of the Logger
     * @returns The Logger instance
     */
    static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }
    
    /**
     * Set the minimum log level for filtering messages
     * @param level The minimum log level to display
     */
    setLogLevel(level: LogLevel): void {
        this.logLevel = level;
    }
    
    /**
     * Log a debug message
     * @param message The message to log
     * @param args Additional arguments to log
     */
    debug(message: string, ...args: any[]): void {
        this.log(LogLevel.Debug, message, ...args);
    }
    
    /**
     * Log an info message
     * @param message The message to log
     * @param args Additional arguments to log
     */
    info(message: string, ...args: any[]): void {
        this.log(LogLevel.Info, message, ...args);
    }
    
    /**
     * Log a warning message
     * @param message The message to log
     * @param args Additional arguments to log
     */
    warning(message: string, ...args: any[]): void {
        this.log(LogLevel.Warning, message, ...args);
    }
    
    /**
     * Log an error message
     * @param message The message to log
     * @param error Optional error object or additional arguments
     */
    error(message: string, error?: unknown): void {
        this.log(LogLevel.Error, message, error);
    }
    
    /**
     * Core logging method that handles message formatting and output
     * @param level The log level
     * @param message The message to log
     * @param args Additional arguments to log
     */
    /**
     * JSON replacer that redacts sensitive fields from log output
     */
    private static sensitiveFieldReplacer(_key: string, value: unknown): unknown {
        if (typeof _key === 'string') {
            const lower = _key.toLowerCase();
            if (lower.includes('apikey') || lower.includes('api_key') ||
                lower.includes('token') || lower.includes('secret') ||
                lower.includes('password') || lower.includes('authorization') ||
                lower.includes('credential')) {
                return typeof value === 'string' ? '[REDACTED]' : value;
            }
        }
        return value;
    }

    log(level: LogLevel, message: string, ...args: any[]): void {
        if (level < this.logLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const levelStr = LogLevel[level].toUpperCase();
        const formattedMessage = `[${timestamp}] [${levelStr}] ${message}`;

        this.outputChannel.appendLine(formattedMessage);

        if (args.length > 0) {
            const sanitized = args.map(arg => {
                if (arg instanceof Error) {
                    return { name: arg.name, message: arg.message };
                }
                return arg;
            });
            this.outputChannel.appendLine(
                JSON.stringify(sanitized, Logger.sensitiveFieldReplacer, 2)
            );
        }

        // Also log to console for development (with same sanitization)
        if (args.length > 0) {
            const sanitized = args.map(arg =>
                arg instanceof Error ? { name: arg.name, message: arg.message } : arg
            );
            console.log(formattedMessage, ...sanitized);
        } else {
            console.log(formattedMessage);
        }
    }
    
    /**
     * Show the output channel in VS Code
     */
    show(): void {
        this.outputChannel.show();
    }
    
    /**
     * Dispose of the output channel and clean up resources
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}
