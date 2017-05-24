var statusCodes = {};

statusCodes[exports.SUCCESS = 0] = "Success";

statusCodes[exports.USER_CREATED = 1] = "User created successfully";
statusCodes[exports.USER_UPDATED = 2] = "User updated successfully";
statusCodes[exports.USER_DELETED = 3] = "User deleted successfully";
statusCodes[exports.PDF_CREATED = 4] = "Pdf created successfully";
statusCodes[exports.PDF_UPDATED = 5] = "Pdf updated successfully";
statusCodes[exports.PDF_DELETED = 6] = "Pdf deleted successfully";

statusCodes[exports.INTERNAL_ERROR = 1000] = "Internal error";
statusCodes[exports.NOT_FOUND = 1001] = "It does not found";
statusCodes[exports.INCORRECT_PASS = 1002] = "Password do not match";
statusCodes[exports.BAD_REQUEST = 1003] = "Bad request";
statusCodes[exports.DATABASE_ERROR = 1004] = "Database error";
statusCodes[exports.NOT_LOGGED = 1005] = "You are not logged";
statusCodes[exports.USER_NOT_FOUND = 1006] = "User not found";
statusCodes[exports.PASS_NOT_MATCH = 1007] = "Passwords do not match";
statusCodes[exports.AC_NOT_MATCH = 1008] = "Activation codes do not match";
statusCodes[exports.USER_DESACTIVATED = 1009] = "This user is desactivated";




exports.getStatusText = function(statusCode) {
if (statusCodes.hasOwnProperty(statusCode)) {
return statusCodes[statusCode];
} else {
throw new Error("Status code does not exist: " + statusCode);
}
};