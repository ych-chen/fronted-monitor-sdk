import { SpanContext, trace } from "@opentelemetry/api";
import { SeverityNumber, LogRecord, logs } from "@opentelemetry/api-logs";

import { LogLevel } from "../constants";

/**
 * 日志监控类，负责初始化和管理 OpenTelemetry 日志收集
 */
export class LogManager {

    private logger: any;
    private globalAttributes: Record<string, any> = {};
    constructor(serviceName: string, serviceVersion?: string | undefined) {
        this.logger = logs.getLogger(serviceName, serviceVersion)
    }

    // 添加全局字段（每条日志自动附带）
    setGlobalAttributes = (key: string, value: any) => { this.globalAttributes[key] = value }

    /**
     * 将 logLevel 枚举转换为 openTelemetry 的 SeverityNumber
     * @param level 
     * @returns 
     */
    private static logLevelToSeverityNumber(level: LogLevel): SeverityNumber {
        switch (level) {
            case LogLevel.TRACE:
                return SeverityNumber.TRACE
            case LogLevel.DEBUG:
                return SeverityNumber.DEBUG
            case LogLevel.INFO:
                return SeverityNumber.INFO
            case LogLevel.WARN:
                return SeverityNumber.WARN
            case LogLevel.ERROR:
                return SeverityNumber.ERROR
            case LogLevel.FATAL:
                return SeverityNumber.FATAL
            default:
                return SeverityNumber.INFO
        }
    }

    /**
     * 记录日志（通用方法）
     * @param level 日志级别
     * @param message 日志消息内容
     * @param attributes 自定义属性，包含额外的上下文信息（可选）
     * @param error 错误对象，用于记录异常信息（可选）
     * @throws 如果 LogManager 尚未初始化，将抛出错误
     */
    public sendLog(
        level: LogLevel,
        message: string,
        attributes?: Record<string, any>,
        error?: Error,
        spanContext?: SpanContext
    ) {

        if (!this.logger) {
            throw new Error("Logs monitor not initialized");
        }

        const logRecord: Partial<LogRecord> = {
            body: message,
            severityNumber: LogManager.logLevelToSeverityNumber(level),
            severityText: level,
            attributes: {
                ...this.globalAttributes,
                ...attributes,
                ...(error ? { 'error.message': error.message, 'error.stack': error.stack } : {}),
                traceId: spanContext?.traceId,
                spanId: spanContext?.spanId,
            },
            timestamp: Date.now(),
        }
        this.logger.emit(logRecord as LogRecord)
    }

    /**
     * 记录 TRACE 级别的日志
     * TRACE 级别 用于最详细的调试信息，用于跟踪代码执行流程
     * @param message 
     * @param attributes 
     * @param error 
     */
    public trace(message: string, attributes?: Record<string, any>, error?: Error) {
        this.sendLog(LogLevel.TRACE, message, attributes, error)
    }

    /**
     * 记录 DEBUG 级别的日志
     * DEBUG 级别 用于调试信息，用于开发和调试过程
     * @param message 
     * @param attributes 
     * @param error 
     */
    public debug(message: string, attributes?: Record<string, any>, error?: Error) {
        this.sendLog(LogLevel.DEBUG, message, attributes, error)
    }

    /**
    * 记录 INFO 级别的日志
    * INFO 级别 用于一般信息，记录正常的系统运行状态
    * @param message 
    * @param attributes 
    * @param error 
    */
    public info(message: string, attributes?: Record<string, any>, error?: Error) {
        this.sendLog(LogLevel.INFO, message, attributes, error)
    }


    /**
     * 记录 WARN 级别的日志
     * WARN 级别 用于警告信息，表示潜在的问题需要关注
     * @param message 
     * @param attributes 
     * @param error 
     */
    public warn(message: string, attributes?: Record<string, any>, error?: Error) {
        this.sendLog(LogLevel.WARN, message, attributes, error)
    }

    /**
     * 记录 ERROR 级别的日志
     * ERROR 级别用于错误信息，表示已经发生错误
     * @param message 
     * @param attributes 
     * @param error 
     */
    public error(message: string, attributes?: Record<string, any>, error?: Error, spanContext: SpanContext) {
        this.sendLog(LogLevel.ERROR, message, attributes, error, spanContext)
    }

    /**
     * 记录 FATAL 级别的日志
     * FATAL 级别用于致命错误信息，表示系统无法继续运行的严重错误
     * @param message 
     * @param attributes 
     * @param error 
     */
    public fatal(message: string, attributes?: Record<string, any>, error?: Error) {
        this.sendLog(LogLevel.FATAL, message, attributes, error)
    }
}

