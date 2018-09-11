var statusCodes = {};

statusCodes[exports.SUCCESS = 0] = "Success";

statusCodes[exports.USER_CREATED = 101] = "User created successfully. Check your e-mail";
statusCodes[exports.USER_UPDATED = 102] = "User updated successfully";
statusCodes[exports.USER_DELETED = 103] = "User deleted successfully";
statusCodes[exports.USER_DESACTIVATED = 104] = "User desactivated successfully";
statusCodes[exports.EMAIL_SENDED = 105] = "Email was sended successfully. Check your email to confirm your email";

statusCodes[exports.PDF_CREATED = 501] = "PDF created successfully";
statusCodes[exports.PDF_UPDATED = 502] = "PDF updated successfully";
statusCodes[exports.PDF_DELETED = 503] = "PDF deleted successfully";
statusCodes[exports.PDF_DELETED = 504] = "PDF deleted successfully";

// Generic errors
statusCodes[exports.INTERNAL_ERROR = 1000] = "Internal error";
statusCodes[exports.NOT_FOUND = 1001] = "Not found";
statusCodes[exports.INCORRECT_PASS = 1002] = "Password do not match";
statusCodes[exports.BAD_REQUEST = 1003] = "Bad request";
statusCodes[exports.DATABASE_ERROR = 1004] = "Database error";
statusCodes[exports.NOT_LOGGED = 1005] = "You are not logged";
statusCodes[exports.UNKNOWN = 1006] = "Unknown error";
statusCodes[exports.PASS_NOT_MATCH = 1007] = "Passwords do not match";
statusCodes[exports.PERMISION_DENIED = 1008] = "Permision denied";

// User errors
statusCodes[exports.USER_NOT_FOUND = 2000] = "User not found";
statusCodes[exports.USER_DESACTIVATED = 2001] = "User is desactivated";
statusCodes[exports.USER_ALREADY_EXISTS = 2002] = "Email is already used by other user";
statusCodes[exports.EMAIL_ERROR = 2003] = "Email was not valid";

// PDF errors
statusCodes[exports.PDF_NOT_FOUND = 3000] = "PDF not found";
statusCodes[exports.PDF_NOT_LOCKED = 3001] = "Pdf is not locked";
statusCodes[exports.PDF_NOT_SIGNER = 3002] = "You can't sign this PDF";
statusCodes[exports.PDF_LOCKED = 3003] = "PDF locked for other user";





exports.getStatusText = function (statusCode) {
    if (statusCodes.hasOwnProperty(statusCode)) {
        return statusCodes[statusCode];
    } else {
        throw new Error("Status code does not exist: " + statusCode);
    }
};