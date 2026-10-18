import { NodeSDK } from "@opentelemetry/sdk-node"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node"
import { diag, DiagConsoleLogger, DiagLogLevel } from "@opentelemetry/api"

// Optional diagnostic logging to debug OpenTelemetry connection issues
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO)

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    // Point this to your OTel Collector or Tempo endpoint
    url:
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
      "http://localhost:4318/v1/traces",
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy filesystem traces
      "@opentelemetry/instrumentation-fs": { enabled: false },
    }),
  ],
})

sdk.start()

// Graceful shutdown
process.on("SIGTERM", () => {
  sdk
    .shutdown()
    .then(() => console.log("OpenTelemetry SDK terminated successfully"))
    .catch((error) => console.log("Error terminating OpenTelemetry SDK", error))
    .finally(() => process.exit(0))
})
