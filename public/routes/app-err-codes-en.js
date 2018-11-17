var statusCodes = {};

statusCodes[exports.SUCCESS = 0] = "Success";

statusCodes[exports.USER_CREATED = 1] = "User created successfully. Check your e-mail";
statusCodes[exports.USER_UPDATED = 2] = "User updated successfully";
statusCodes[exports.USER_DELETED = 3] = "User deleted successfully";
statusCodes[exports.USER_DESACTIVATED = 4] = "User desactivated successfully";
statusCodes[exports.EMAIL_SENDED = 5] = "Email was sended successfully. Check your email to confirm your email";
statusCodes[exports.USER_ACTIVATED = 6] = "User activated successfully";
statusCodes[exports.USER_LOG_OUT = 7] = "User logged out successfully";
statusCodes[exports.USER_RELATED_DEL = 8] = "User related deleted successfully";

statusCodes[exports.PDF_CREATED = 101] = "PDF created successfully";
statusCodes[exports.PDF_UPDATED = 102] = "PDF updated successfully";
statusCodes[exports.PDF_DELETED = 103] = "PDF deleted successfully";
statusCodes[exports.PDF_DELETED = 104] = "PDF deleted successfully";
statusCodes[exports.PDF_SIGNED = 105] = "PDF signed successfully";
statusCodes[exports.PDF_UNLOCKED_SUCCESS = 106] = "PDF unlocked successfully";
statusCodes[exports.PDF_LOCKED_SUCCESS = 107] = "PDF locked successfully";
statusCodes[exports.PDF_SIGNER_ADDED = 108] = "Added signer(s) to PDF successfully";

// Generic errors
statusCodes[exports.INTERNAL_ERROR = 1000] = "Internal error";
statusCodes[exports.NOT_FOUND = 1001] = "Not found";
statusCodes[exports.INCORRECT_PASS = 1002] = "Password do not match";
statusCodes[exports.BAD_REQUEST = 1003] = "Bad request";
statusCodes[exports.DATABASE_ERROR = 1004] = "Database error";
statusCodes[exports.UNKNOWN = 1006] = "Unknown error";
statusCodes[exports.PASS_NOT_MATCH = 1007] = "Passwords do not match";
statusCodes[exports.PERMISION_DENIED = 1008] = "Permision denied";
statusCodes[exports.NO_BODY = 1009] = "Request without body";
statusCodes[exports.ERROR_AC = 1010] = "Activation code error";
statusCodes[exports.TIMEOUT = 1011] = "Timeout";
statusCodes[exports.AC_NOT_MATCH = 1012] = "Activation code is wrong";
statusCodes[exports.HANDLER_ERROR = 1012] = "Handler error";

// User errors
statusCodes[exports.USER_NOT_FOUND = 2000] = "User not found";
statusCodes[exports.USER_DESACTIVATED = 2001] = "User is desactivated";
statusCodes[exports.USER_ALREADY_EXISTS = 2002] = "Email is already used by other user";
statusCodes[exports.EMAIL_ERROR = 2003] = "Email was not valid";
statusCodes[exports.USER_NOT_OWNER = 2004] = "User is not a owner";
statusCodes[exports.USER_NOT_SIGNER = 2005] = "User is not a signer";
statusCodes[exports.USER_NOT_LOGGED = 2006] = "You are not logged";
statusCodes[exports.USER_RELATED_NOT_DEL = 2008] = "User related not deleted";

// PDF errors
statusCodes[exports.PDF_NOT_FOUND = 3000] = "PDF not found";
statusCodes[exports.PDF_NOT_LOCKED = 3001] = "Pdf is not locked";
statusCodes[exports.PDF_NOT_SIGNER = 3002] = "You can't sign this PDF";
statusCodes[exports.PDF_LOCKED = 3003] = "PDF already locked by other signer";
statusCodes[exports.PDF_WITH_STAMP = 3004] = "PDF has stamp. You can not add new signatures";
statusCodes[exports.PDF_TIMEOUT = 3005] = "PDF timeout";
statusCodes[exports.PDF_ALREADY_SIGNED = 3006] = "PDF already signed by user";
statusCodes[exports.PDF_NOT_LOCKED_BY_YOU = 3007] = "PDF not locked by you";
statusCodes[exports.PDF_OUTDATED = 3008] = "PDF is outdated, download the last version of PDF and send it again";

// TOKEN errors
statusCodes[exports.TOKEN_NOT_FOUND = 4000] = "TOKEN not found";

// CLIENT errors
statusCodes[exports.CLIENT_NOT_FOUND = 5000] = "CLIENT not found";


/**
 * Return a json with code and message code
 * @param code
 * @returns {{code: {number}, message: {string}}}
 */
exports.getJsonApp = function (statusCode) {
    var res = {
        code: statusCode,
        message: statusCodes[statusCode]
    };
    return res;
};

/**
 * Return text that correspond to statusCode
 * @param statusCode
 * @returns {*}
 */
exports.getStatusText = function (statusCode) {
    if (statusCodes.hasOwnProperty(statusCode)) {
        return statusCodes[statusCode];
    } else {
        throw new Error("Status code does not exist: " + statusCode);
    }
};