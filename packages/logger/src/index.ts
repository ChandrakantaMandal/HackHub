import * as winston from "winston"
import morgan from "morgan"
import { env } from "@workspace/config"
import { trace, context } from "@opentelemetry/api"

const { combine, timestamp, printf, errors, json } = winston.format

// Injects OpenTelemetry Trace ID & Span ID into log metadata
const otelFormat = winston.format((info) => {
  const span = trace.getSpan(context.active())
  if (span) {
    const spanContext = span.spanContext()
    info.trace_id = spanContext.traceId
    info.span_id = spanContext.spanId
  }
  return info
})

const consoleFormat = printf(
  ({ level, message, timestamp, stack, trace_id, span_id, ...meta }) => {
    const logMessage = stack || message
    // If running in development, print a readable string; production can rely purely on JSON
    return JSON.stringify({
      timestamp,
      level,
      message: logMessage,
      trace_id,
      span_id,
      ...meta,
    })
  }
)

export const logger = winston.createLogger({
  level: env.LOG_LEVEL || "info",
  format: combine(
    errors({ stack: true }),
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    otelFormat(),
    json() // Outputs strict JSON to stdout for Loki / OTel Collector
  ),
  transports: [
    new winston.transports.Console({
      format:
        env.NODE_ENV === "production"
          ? combine(timestamp(), otelFormat(), json())
          : combine(timestamp(), otelFormat(), consoleFormat),
    }),
  ],
})

export const httpLogger = morgan("combined", {
  stream: {
    write: (message: string) => {
      logger.info(message.trim())
    },
  },
})
