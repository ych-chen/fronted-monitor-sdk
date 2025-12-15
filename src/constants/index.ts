export enum LogLevel {
    TRACE = 'TRACE', // 最详细的调试信息，用于跟踪代码执行流程
    DEBUG = 'DEBUG', // 调试信息，用于开发和调试
    INFO = 'INFO', // 一般信息，用于记录正常的系统运行状态
    WARN = 'WARN', // 警告信息，用于记录潜在的问题或错误
    ERROR = 'ERROR', // 错误信息，用于记录致命的错误或异常情况
    FATAL = 'FATAL' // 致命错误，表示系统无法继续继续运行
}