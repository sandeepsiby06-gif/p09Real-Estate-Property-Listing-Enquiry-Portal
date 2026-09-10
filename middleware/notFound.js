/**
 * Catches all unhandled routes and returns consistent 404 response
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route '${req.originalUrl}' with method [${req.method}] was not found on this server.`,
    errorCode: 'ROUTE_NOT_FOUND'
  });
};

module.exports = notFound;
