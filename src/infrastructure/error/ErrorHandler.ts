import * as vscode from 'vscode';
import { Logger } from '../logging/Logger';
import { BaseError, ErrorSeverity } from '../../types/errors/BaseError';

export { ErrorSeverity };

/**
 * Context information for error handling
 */
export interface ErrorContext {
    /** The operation that was being performed when the error occurred */
    operation: string;
    /** The component where the error occurred */
    component: string;
    /** Additional metadata about the error */
    metadata?: Record<string, unknown>;
}

/**
 * Centralized error handler for the extension
 * Provides consistent error logging, user notifications, and telemetry reporting
 */
export class ErrorHandler {
    private static logger = Logger.getInstance();

    /**
     * Handle an error with centralized error management
     * @param error The error to handle
     * @param context Context information about where and why the error occurred
     */
    static handle(error: unknown, context: ErrorContext | string): void {
        const ctx =
            typeof context === 'string' ? { operation: context, component: 'unknown' } : context;

        const severity = this.determineSeverity(error);
        const message = this.formatErrorMessage(error, ctx);

        // Log the error
        this.logError(severity, message, error);

        // Show user notification
        this.showUserNotification(severity, message);
    }

    /**
     * Determine the severity of an error based on its type
     * @param error The error to analyze
     * @returns The determined severity level
     */
    private static determineSeverity(error: unknown): ErrorSeverity {
        if (error instanceof BaseError) {
            return error.severity;
        }
        return ErrorSeverity.Error;
    }

    /**
     * Format an error message with context information
     * @param error The error to format
     * @param ctx The error context
     * @returns A formatted error message
     */
    private static formatErrorMessage(error: unknown, ctx: ErrorContext): string {
        let errorMsg: string;

        if (error instanceof BaseError) {
            errorMsg = error.toString();
        } else if (error instanceof Error) {
            errorMsg = error.message;
        } else {
            errorMsg = String(error);
        }

        return `[${ctx.component}] ${ctx.operation}: ${errorMsg}`;
    }

    /**
     * Log an error with appropriate log level
     * @param severity The error severity
     * @param message The formatted error message
     * @param error The original error object
     */
    private static logError(severity: ErrorSeverity, message: string, error: unknown): void {
        switch (severity) {
            case ErrorSeverity.Critical:
            case ErrorSeverity.Error:
                this.logger.error(message, error);
                break;
            case ErrorSeverity.Warning:
                this.logger.warning(message, error);
                break;
            case ErrorSeverity.Info:
                this.logger.info(message, error);
                break;
        }
    }

    /**
     * Show a user notification based on error severity
     * @param severity The error severity
     * @param message The message to display
     */
    private static showUserNotification(severity: ErrorSeverity, message: string): void {
        // Clean up the message for user display (remove technical prefixes)
        const userMessage = this.cleanMessageForUser(message);

        switch (severity) {
            case ErrorSeverity.Critical:
            case ErrorSeverity.Error:
                vscode.window.showErrorMessage(userMessage);
                break;
            case ErrorSeverity.Warning:
                vscode.window.showWarningMessage(userMessage);
                break;
            case ErrorSeverity.Info:
                vscode.window.showInformationMessage(userMessage);
                break;
        }
    }

    /**
     * Clean up error message for user display
     * Removes technical prefixes and makes the message more user-friendly
     * @param message The raw error message
     * @returns A cleaned message suitable for user display
     */
    private static cleanMessageForUser(message: string): string {
        // Remove component prefixes like [ComponentName]
        let cleaned = message.replace(/^\[.*?\]\s*/, '');

        // Remove error codes like [ERROR_CODE]
        cleaned = cleaned.replace(/\[.*?_ERROR\]:\s*/, '');

        return cleaned;
    }
}
