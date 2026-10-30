import * as path from "node:path"

import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api"

import { NodeSDK } from "@opentelemetry/sdk-node"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"

import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http"
import { WinstonInstrumentation } from "@opentelemetry/instrumentation-winston"

import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs"

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

function resolveServiceName(): string {
  if (process.env.OTEL_SERVICE_NAME) return process.env.OTEL_SERVICE_NAME
  // e.g. "D:\Project\HackHub\apps\project-service\src\index.ts" → "project-service"
  const script = (process.argv[1] ?? "").replace(/\\/g, "/")
  const appMatch = script.match(/\/apps\/([^/]+)\//)
  if (appMatch?.[1]) return appMatch[1]
  const pkg = process.env.npm_package_name
  if (pkg) return pkg.replace(/^@[^/]+\//, "")
  return path.basename(process.cwd())
}

process.env.OTEL_SERVICE_NAME = resolveServiceName()

const endpoint = (
  process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318"
).replace(/\/+$/, "")

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
  }),

  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
    }),
    exportIntervalMillis: 5000,
  }),

  logRecordProcessor: new BatchLogRecordProcessor(
    new OTLPLogExporter({
      url: `${endpoint}/v1/logs`,
    })
  ),

  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-fs": {
        enabled: false,
      },
      "@opentelemetry/instrumentation-winston": {
        enabled: false,
      },
    }),

    new WinstonInstrumentation({
      disableLogSending: false,
    }),
  ],
})

sdk.start()

let shuttingDown = false

async function shutdown() {
  if (shuttingDown) return
  shuttingDown = true

  try {
    await sdk.shutdown()
    console.log("OpenTelemetry SDK shut down successfully")
  } catch (error) {
    console.error("OpenTelemetry SDK shutdown failed", error)
    process.exitCode = 1
  }
}

process.once("SIGTERM", () => void shutdown())
process.once("SIGINT", () => void shutdown())
