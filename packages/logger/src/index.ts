import winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

const { combine, timestamp, colorize, printf, errors, json } = winston.format

const logFormat = printf(({ level, message, timestamp, stack }) => {
  if (stack) {
    return `[${timestamp}] ${level}: ${stack}`
  }

  return `[${timestamp}] ${level}: ${message}`
})

const fileRotateTransport = new DailyRotateFile({
  dirname: "logs",
  filename: "application-%DATE%.log",
  datePattern: "YYYY-MM-DD",

  maxSize: "20m",
  maxFiles: "14d",

  zippedArchive: true,
})

const errorRotateTransport = new DailyRotateFile({
  dirname: "logs",
  filename: "error-%DATE%.log",
  datePattern: "YYYY-MM-DD",

  level: "error",

  maxSize: "20m",
  maxFiles: "30d",

  zippedArchive: true,
})

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",

  format: combine(
    errors({ stack: true }),
    timestamp({
      format: "YYYY-MM-DD HH:mm:ss",
    }),
    logFormat
  ),

  transports: [
    new winston.transports.Console({
      format: combine(colorize(), timestamp(), logFormat),
    }),

    fileRotateTransport,
    errorRotateTransport,
  ],
})

export * from "./httpLogger"
