import Guacamole from "guacamole-common-js";

export const getGuacamoleErrorMessage = (error: Guacamole.Status): string => {
	const StatusCodes = Guacamole.Status.Code;

	switch (error.code) {
		case StatusCodes.UPSTREAM_TIMEOUT:
			return "Server timeout.";
		case StatusCodes.UPSTREAM_ERROR:
			return "Upstream server error.";
		case StatusCodes.RESOURCE_NOT_FOUND:
			return "Resource not found.";
		case StatusCodes.CLIENT_BAD_REQUEST:
			return "Client sent a bad request.";
		case StatusCodes.CLIENT_UNAUTHORIZED:
			return "Permission Denied. Check token/permissions.";
		case StatusCodes.CLIENT_FORBIDDEN:
			return "Forbidden.";
		default:
			return `Guacamole error (code 0x${error.code.toString(16)}): ${
				error.message || "Unknown"
			}`;
	}
};
