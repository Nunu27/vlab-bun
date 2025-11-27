/**
 * TypeScript types for Apache Guacamole connection parameters
 * Based on: https://guacamole.apache.org/doc/gug/configuring-guacamole.html
 * and https://guacamole.apache.org/doc/gug/json-auth.html
 */

/**
 * Supported Guacamole protocols
 */
export type GuacamoleProtocol = "rdp" | "vnc" | "ssh" | "telnet" | "kubernetes";

/**
 * Common parameters available for all protocols
 */
export interface CommonParameters {
	/** If set to "true", text copied within the remote desktop will not be accessible by the user */
	"disable-copy"?: boolean;
	/** If set to "true", text copied at the browser will not be accessible within the remote desktop */
	"disable-paste"?: boolean;

	// Recording parameters
	/** Directory in which screen recording files should be created */
	"recording-path"?: string;
	/** If set to "true", the recording directory will be created if it doesn't exist */
	"create-recording-path"?: boolean;
	/** Filename to use for any created recordings */
	"recording-name"?: string;
	/** If set to "true", graphical output will be excluded from recording */
	"recording-exclude-output"?: boolean;
	/** If set to "true", mouse events will be excluded from recording */
	"recording-exclude-mouse"?: boolean;
	/** If set to "true", key events will be included in recording */
	"recording-include-keys"?: boolean;
	/** If set to "true", allows overwriting existing recording files */
	"recording-write-existing"?: boolean;

	// Typescript recording (SSH/Telnet)
	/** Directory for typescript files (SSH/Telnet only) */
	"typescript-path"?: string;
	/** If set to "true", typescript directory will be created if it doesn't exist */
	"create-typescript-path"?: boolean;
	/** Base filename for typescript recordings */
	"typescript-name"?: string;
	/** If set to "true", allows overwriting existing typescript files */
	"typescript-write-existing"?: boolean;

	// Wake-on-LAN
	/** If set to "true", Guacamole will send a Wake-on-LAN packet */
	"wol-send-packet"?: boolean;
	/** MAC address for Wake-on-LAN */
	"wol-mac-addr"?: string;
	/** IPv4 broadcast or IPv6 multicast address for WoL */
	"wol-broadcast-addr"?: string;
	/** UDP port for WoL packet */
	"wol-udp-port"?: string;
	/** Seconds to wait after sending WoL packet before connecting */
	"wol-wait-time"?: string;
}

/**
 * SFTP parameters for file transfer
 */
export interface SFTPParameters {
	/** If set to "true", file transfer via SFTP will be enabled */
	"enable-sftp"?: boolean;
	/** Hostname or IP address of the SSH server for SFTP */
	"sftp-hostname"?: string;
	/** Port for SFTP (default: 22) */
	"sftp-port"?: string;
	/** Timeout for SFTP server in seconds (default: 10) */
	"sftp-timeout"?: string;
	/** Known hosts entry for the SFTP server */
	"sftp-host-key"?: string;
	/** Username for SFTP authentication */
	"sftp-username"?: string;
	/** Password for SFTP authentication */
	"sftp-password"?: string;
	/** Private key for SFTP public key authentication */
	"sftp-private-key"?: string;
	/** Passphrase for SFTP private key */
	"sftp-passphrase"?: string;
	/** Public key for SFTP certificate-based authentication */
	"sftp-public-key"?: string;
	/** Default upload directory for SFTP */
	"sftp-directory"?: string;
	/** Root directory for SFTP file browser */
	"sftp-root-directory"?: string;
	/** Keepalive interval for SFTP in seconds */
	"sftp-server-alive-interval"?: string;
	/** If set to "true", downloads via SFTP will be disabled */
	"sftp-disable-download"?: boolean;
	/** If set to "true", uploads via SFTP will be disabled */
	"sftp-disable-upload"?: boolean;
}

/**
 * Terminal parameters (SSH, Telnet, Kubernetes)
 */
export interface TerminalParameters {
	/** Terminal color scheme */
	"color-scheme"?: string;
	/** Font name (must be installed on server) */
	"font-name"?: string;
	/** Font size in points */
	"font-size"?: string;
	/** Maximum scrollback buffer rows */
	scrollback?: string;
	/** ASCII code for backspace key (default: 127) */
	backspace?: string;
	/** Terminal emulator type (default: "linux") */
	"terminal-type"?: string;
}

/**
 * VNC connection parameters
 */
export interface VNCParameters extends CommonParameters, SFTPParameters {
	/** Hostname or IP address of the VNC server */
	hostname: string;
	/** Port of the VNC server (default: 5900 + display number) */
	port?: string;
	/** Number of connection retry attempts */
	autoretry?: string;

	// Authentication
	/** Username for VNC authentication */
	username?: string;
	/** Password for VNC authentication */
	password?: string;

	// Display settings
	/** Color depth in bits-per-pixel (8, 16, 24, or 32) */
	"color-depth"?: "8" | "16" | "24" | "32";
	/** If set to "true", asks VNC server to disable local input devices */
	"disable-server-input"?: boolean;
	/** If set to "true", disables client-side display size updates */
	"disable-display-resize"?: boolean;
	/** If set to "true", swaps red and blue color components */
	"swap-red-blue"?: boolean;
	/** Cursor rendering mode ("remote" for server-side cursor) */
	cursor?: "remote" | "local";
	/** Space-delimited list of VNC encodings to use */
	encodings?: string;
	/** If set to "true", connection will be read-only */
	"read-only"?: boolean;
	/** If set to "true", only lossless compression will be used */
	"force-lossless"?: boolean;
	/** Compression level (0-9) for tight/zlib encoding */
	"compress-level"?: string;
	/** JPEG quality level (0-9) for tight encoding */
	"quality-level"?: string;

	// VNC Repeater
	/** Destination host for VNC repeater */
	"dest-host"?: string;
	/** Destination port for VNC repeater */
	"dest-port"?: string;

	// Reverse connection
	/** If set to "true", enables reverse VNC connection */
	"reverse-connect"?: boolean;
	/** Timeout in milliseconds for reverse connection (default: 5000) */
	"listen-timeout"?: string;

	// Audio via PulseAudio
	/** If set to "true", enables audio support via PulseAudio */
	"enable-audio"?: boolean;
	/** Hostname of PulseAudio server */
	"audio-servername"?: string;

	// Clipboard encoding
	/** Clipboard encoding ("ISO8859-1", "UTF-8", "UTF-16", "CP1252") */
	"clipboard-encoding"?: "ISO8859-1" | "UTF-8" | "UTF-16" | "CP1252";
}

/**
 * RDP connection parameters
 */
export interface RDPParameters extends CommonParameters, SFTPParameters {
	/** Hostname or IP address of the RDP server */
	hostname: string;
	/** Port of the RDP server (default: 3389) */
	port?: string;
	/** Connection timeout in seconds (default: 10) */
	timeout?: string;

	// Authentication and security
	/** Username for authentication */
	username?: string;
	/** Password for authentication */
	password?: string;
	/** Domain for authentication */
	domain?: string;
	/** Security mode ("any", "nla", "nla-ext", "tls", "vmconnect", "rdp") */
	security?: "any" | "nla" | "nla-ext" | "tls" | "vmconnect" | "rdp";
	/** If set to "true", ignores certificate validation errors */
	"ignore-cert"?: boolean;
	/** If set to "true", enables certificate Trust on First Use */
	"cert-tofu"?: boolean;
	/** Comma-separated list of certificate fingerprint/hash combinations */
	"cert-fingerprints"?: string;
	/** If set to "true", disables authentication */
	"disable-auth"?: boolean;

	// Clipboard normalization
	/** Line ending normalization ("preserve", "unix", "windows") */
	"normalize-clipboard"?: "preserve" | "unix" | "windows";

	// Session settings
	/** Client name to send to RDP server */
	"client-name"?: string;
	/** If set to "true", connects to console (admin) session */
	console?: boolean;
	/** Full path to program to run on connection */
	"initial-program"?: string;
	/** Server-side keyboard layout */
	"server-layout"?: string;
	/** Timezone to send to server (IANA format) */
	timezone?: string;

	// Display settings
	/** Color depth in bits-per-pixel (8, 16, or 24) */
	"color-depth"?: "8" | "16" | "24";
	/** Display width in pixels */
	width?: string;
	/** Display height in pixels */
	height?: string;
	/** Display DPI */
	dpi?: string;
	/** Resize method ("display-update" or "reconnect") */
	"resize-method"?: "display-update" | "reconnect";
	/** If set to "true", only lossless compression will be used */
	"force-lossless"?: boolean;

	// Device redirection
	/** If set to "true", disables audio */
	"disable-audio"?: boolean;
	/** If set to "true", enables audio input (microphone) */
	"enable-audio-input"?: boolean;
	/** If set to "true", enables multi-touch events */
	"enable-touch"?: boolean;
	/** If set to "true", enables printing to PDF */
	"enable-printing"?: boolean;
	/** Name of the redirected printer */
	"printer-name"?: string;
	/** If set to "true", enables drive redirection */
	"enable-drive"?: boolean;
	/** If set to "true", disables file downloads */
	"disable-download"?: boolean;
	/** If set to "true", disables file uploads */
	"disable-upload"?: boolean;
	/** Name of the redirected drive */
	"drive-name"?: string;
	/** Directory for drive redirection on Guacamole server */
	"drive-path"?: string;
	/** If set to "true", creates drive path if it doesn't exist */
	"create-drive-path"?: boolean;
	/** If set to "true", enables audio in console session */
	"console-audio"?: boolean;
	/** Comma-separated list of static channel names */
	"static-channels"?: string;

	// Preconnection PDU (Hyper-V)
	/** Preconnection ID for Hyper-V */
	"preconnection-id"?: string;
	/** Preconnection BLOB for Hyper-V (VM ID) */
	"preconnection-blob"?: string;

	// Remote Desktop Gateway
	/** Gateway hostname */
	"gateway-hostname"?: string;
	/** Gateway port (default: 443) */
	"gateway-port"?: string;
	/** Gateway username */
	"gateway-username"?: string;
	/** Gateway password */
	"gateway-password"?: string;
	/** Gateway domain */
	"gateway-domain"?: string;

	// Load balancing
	/** Load balancing info/cookie for connection broker */
	"load-balance-info"?: string;

	// Performance flags
	/** If set to "true", enables desktop wallpaper */
	"enable-wallpaper"?: boolean;
	/** If set to "true", enables window theming */
	"enable-theming"?: boolean;
	/** If set to "true", enables font smoothing */
	"enable-font-smoothing"?: boolean;
	/** If set to "true", enables full window drag */
	"enable-full-window-drag"?: boolean;
	/** If set to "true", enables desktop composition */
	"enable-desktop-composition"?: boolean;
	/** If set to "true", enables menu animations */
	"enable-menu-animations"?: boolean;
	/** If set to "true", disables bitmap caching */
	"disable-bitmap-caching"?: boolean;
	/** If set to "true", disables offscreen caching */
	"disable-offscreen-caching"?: boolean;
	/** If set to "true", disables glyph caching */
	"disable-glyph-caching"?: boolean;
	/** If set to "true", disables Graphics Pipeline Extension */
	"disable-gfx"?: boolean;

	// RemoteApp
	/** RemoteApp program name (must be prefixed with ||) */
	"remote-app"?: string;
	/** Working directory for RemoteApp */
	"remote-app-dir"?: string;
	/** Command-line arguments for RemoteApp */
	"remote-app-args"?: string;
}

/**
 * SSH connection parameters
 */
export interface SSHParameters extends CommonParameters, TerminalParameters {
	/** Hostname or IP address of the SSH server */
	hostname: string;
	/** Port of the SSH server (default: 22) */
	port?: string;
	/** Connection timeout in seconds (default: 10) */
	timeout?: string;
	/** Known hosts entry for SSH server identity verification */
	"host-key"?: string;
	/** Keepalive interval in seconds (default: 0, minimum: 2) */
	"server-alive-interval"?: string;

	// Authentication
	/** Username for authentication */
	username?: string;
	/** Password for authentication */
	password?: string;
	/** Private key for public key authentication (OpenSSH format) */
	"private-key"?: string;
	/** Passphrase for private key */
	passphrase?: string;
	/** Public key for certificate-based authentication */
	"public-key"?: string;

	// Command execution
	/** Command to execute instead of shell */
	command?: string;

	// Locale
	/** Locale for SSH session (LANG environment variable) */
	locale?: string;
	/** Timezone for SSH session (TZ environment variable, IANA format) */
	timezone?: string;

	// SFTP
	/** If set to "true", enables SFTP file transfer */
	"enable-sftp"?: boolean;
	/** Root directory for SFTP */
	"sftp-root-directory"?: string;
	/** If set to "true", disables SFTP downloads */
	"sftp-disable-download"?: boolean;
	/** If set to "true", disables SFTP uploads */
	"sftp-disable-upload"?: boolean;
}

/**
 * Telnet connection parameters
 */
export interface TelnetParameters extends CommonParameters, TerminalParameters {
	/** Hostname or IP address of the telnet server */
	hostname: string;
	/** Port of the telnet server (default: 23) */
	port?: string;
	/** Connection timeout in seconds (default: 10) */
	timeout?: string;

	// Authentication
	/** Username for authentication */
	username?: string;
	/** Password for authentication */
	password?: string;
	/** Regex for detecting username prompt (POSIX ERE dialect) */
	"username-regex"?: string;
	/** Regex for detecting password prompt (POSIX ERE dialect) */
	"password-regex"?: string;
	/** Regex for detecting successful login (POSIX ERE dialect) */
	"login-success-regex"?: string;
	/** Regex for detecting failed login (POSIX ERE dialect) */
	"login-failure-regex"?: string;
}

/**
 * Kubernetes connection parameters
 */
export interface KubernetesParameters
	extends CommonParameters,
		TerminalParameters {
	/** Hostname or IP address of the Kubernetes server */
	hostname: string;
	/** Port for Kubernetes API (default: 8080) */
	port?: string;
	/** Kubernetes namespace (default: "default") */
	namespace?: string;
	/** Name of the pod */
	pod: string;
	/** Name of the container (optional, uses first container if omitted) */
	container?: string;
	/** Command to run within container (like kubectl exec) */
	"exec-command"?: string;

	// SSL/TLS
	/** If set to "true", enables SSL/TLS */
	"use-ssl"?: boolean;
	/** Client certificate for SSL/TLS (PEM format) */
	"client-cert"?: string;
	/** Client key for SSL/TLS (PEM format) */
	"client-key"?: string;
	/** CA certificate for SSL/TLS (PEM format) */
	"ca-cert"?: string;
	/** If set to "true", ignores SSL/TLS certificate validation */
	"ignore-cert"?: boolean;
}

/**
 * Union type of all connection parameters
 */
export type ConnectionParameters =
	| VNCParameters
	| RDPParameters
	| SSHParameters
	| TelnetParameters
	| KubernetesParameters;

/**
 * Connection settings with protocol and parameters
 */
export interface ConnectionSettings {
	/** Connection protocol */
	protocol: GuacamoleProtocol;
	/** Connection parameters specific to the protocol */
	parameters: ConnectionParameters;
}

/**
 * Connection settings for joining/shadowing an existing connection
 */
export interface JoinConnectionSettings {
	/** ID of the connection to join */
	join: string;
	/** Parameters for the join connection (typically only read-only setting) */
	parameters: {
		"read-only"?: boolean;
	};
}
