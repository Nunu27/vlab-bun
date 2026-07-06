# mikro-routeros

## Overview

Node.js client for the MikroTik RouterOS API. Simple, fast, and lightweight with automatic parameter detection and parsed responses. Ideal for PPPoE, Hotspot, Firewall, Wireless, and general RouterOS automation.

## Installation

```bash
bun add mikro-routeros
```

## Key Features

- ✅ **Automatic parameter detection** for RouterOS commands (query vs action)
- ✅ **Proper error handling** for `!trap` and `!fatal`
- ✅ **Parsed responses** into clean JavaScript objects
- ✅ **Configurable connection timeout** to prevent hanging connections
- ✅ **Covers PPPoE, Hotspot, Firewall, Wireless** and more
- ✅ **Streaming support** for commands like `/interface/monitor-traffic` using EventEmitters

## Usage & API Examples

### Quick Start

```javascript
const { RouterOSClient } = require('mikro-routeros');

async function main() {
  // Optional: Set custom timeout (30 seconds) - default is 30000ms
  const client = new RouterOSClient('192.168.88.1', 8728, 30000);
  await client.connect();
  await client.login('admin', 'password');

  const users = await client.runQuery('/ppp/secret/print', { name: 'user1' });
  console.log(users);

  await client.close();
}

main().catch(console.error);
```

### Library Examples

```javascript
const { RouterOSClient } = require('mikro-routeros');

// Examples of different timeout configurations:
// const client = new RouterOSClient('192.168.88.1'); // Default: port 8728, timeout 30s
// const client = new RouterOSClient('192.168.88.1', 8728); // Default timeout 30s
// const client = new RouterOSClient('192.168.88.1', 8728, 10000); // 10 second timeout
const client = new RouterOSClient('192.168.88.1', 8728, 30000); // 30 second timeout

await client.connect();
await client.login('admin', 'password');

// PPPoE users (query uses ?-prefixed params)
const users = await client.runQuery('/ppp/secret/print', { name: 'user1' });

// Add PPPoE secret (action uses =-prefixed params)
await client.runQuery('/ppp/secret/add', {
  name: 'newuser',
  password: 'password123',
  profile: 'default',
  service: 'pppoe'
});

// Update user
await client.runQuery('/ppp/secret/set', {
  '.id': '*123',
  password: 'newpassword'
});

// Delete user
await client.runQuery('/ppp/secret/remove', { '.id': '*123' });

// Disconnect active user
await client.runQuery('/ppp/active/remove', { '.id': '*456' });

await client.close();
```

### Streaming API Example (e.g., monitor-traffic)

```javascript
const stream = await client.stream('/interface/monitor-traffic', { 
  interface: 'ether1',
  once: '' // optional
});

stream.on('data', (data) => {
  console.log('Traffic data:', data);
});

stream.on('error', (err) => {
  console.error('Stream error:', err);
});

stream.on('end', () => {
  console.log('Stream ended');
});

// To cancel a stream early:
// await stream.cancel();
```

### More MikroTik API Examples

```javascript
// Firewall rules
await client.runQuery('/ip/firewall/filter/print');

// Hotspot users
await client.runQuery('/ip/hotspot/user/print');

// Wireless registration table
await client.runQuery('/interface/wireless/registration-table/print');

// Get system identity
await client.runQuery('/system/identity/print');
```

### API Reference

#### RouterOSClient Constructor

```javascript
new RouterOSClient(host, port = 8728, timeout = 30000)
```

**Parameters:**
- `host` (string): MikroTik RouterOS IP address or hostname
- `port` (number, optional): API port, default is 8728 (TCP)
- `timeout` (number, optional): Connection timeout in milliseconds, default is 30000 (30 seconds)

#### Methods

- `connect(): Promise<void>` - Connect to RouterOS API (TCP)
- `login(username, password): Promise<void>` - Authenticate with RouterOS
- `runQuery(command, params = {}): Promise<object[]>` - Execute command and return parsed objects
- `stream(command, params = {}): Promise<RouterOSStream>` - Execute continuous command and return an EventEmitter for stream responses. Returns objects via `'data'` events. Can be stopped via `stream.cancel()`.
- `close(): void` - Close connection

TypeScript typings are included via `index.d.ts`.

### Error Handling

```javascript
try {
  await client.connect();
  const result = await client.runQuery("/ppp/secret/add", {...});
} catch (error) {
  console.error("Error:", error.message);
  // Connection timeout: "Connection timeout after 30000ms"
  // RouterOS error: "RouterOS Error: failure: secret with the same name already exists"
  // Network error: "ECONNREFUSED" or "ENOTFOUND"
}
```

#### Connection Timeout

If the connection takes longer than the specified timeout, the promise will reject with a timeout error:

```javascript
const client = new RouterOSClient('192.168.1.1', 8728, 5000); // 5 second timeout

try {
  await client.connect();
} catch (error) {
  if (error.message.includes('Connection timeout')) {
    console.log('Connection timed out after 5 seconds');
  }
}
```

### Requirements

- Node.js 12.0.0 or higher
- Access to MikroTik RouterOS with API enabled

Notes:
- RouterOS API default ports: 8728 (plain TCP), 8729 (TLS). This client uses TCP.
- Works with RouterOS v6/v7 command paths.

### Links

- MikroTik RouterOS API docs: [help.mikrotik.com/docs/display/ROS/API](https://help.mikrotik.com/docs/display/ROS/API)
- RouterOS command reference: [wiki.mikrotik.com/wiki/Manual:TOC](https://wiki.mikrotik.com/wiki/Manual:TOC)

### License

ISC

## Development & Scripts

This package has scripts defined in `package.json` for testing:

| Script | Command | Description |
|---|---|---|
| `test` | `bun run test.js` | Runs local tests using test.js |
| `start` | `bun run test.js` | Runs local tests (alias) |

To run the tests:
```bash
bun run test
```
