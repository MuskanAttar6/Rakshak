'use strict';

const path = require('path');

module.exports = {
  /** gRPC server address — set RAKSHAK_GRPC_SERVER env var to override */
  serverAddress: process.env.RAKSHAK_GRPC_SERVER || 'localhost:50051',

  /** Enable TLS — set RAKSHAK_GRPC_TLS=true in production */
  tls: process.env.RAKSHAK_GRPC_TLS === 'true',

  /** How often to send a keepalive heartbeat (ms) */
  heartbeatIntervalMs: parseInt(process.env.RAKSHAK_HEARTBEAT_MS || '30000', 10),

  /** Exponential backoff cap for reconnect attempts (ms) */
  reconnectMaxDelayMs: 30000,

  /** Absolute path to the shared .proto file */
  protoPath: path.join(__dirname, 'proto', 'health.proto'),
};
