const errorHandler = (err, req, res, next) => {
    var statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

    res.status(statusCode);
    if (err.name === "ValidationError") {
        statusCode = 400; // Bad request
    }
    switch (statusCode) {
        case 400:
            res.json({
                title: "Validation Failed",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case 404:
            res.json({
                title: "Not Found",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case 401:
            res.json({
                title: "Unauthorized",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case 403:
            res.json({
                title: "Forbidden",
                message: err.message,
                stackTrace: err.stack
            });
            break;
        case 500:
            res.json({
                title: "Server Error",
                message: err.message,
                stackTrace: err.stack});
        default:
            res.json({
                title: "Server Error",
                message: err.message,
                stackTrace: err.stack
            });
            break;
    }
}
export default errorHandler