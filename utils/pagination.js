/**
 * Extracts and sanitizes pagination parameters from request query
 * @param {Object} query - req.query
 * @param {number} defaultLimit - default page size (default: 10)
 * @returns {Object} { page, limit, skip }
 */
const getPaginationParams = (query, defaultLimit = 10) => {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1 || limit > 100) limit = defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * Builds standard pagination response metadata
 * @param {number} totalCount - total matching records
 * @param {number} page - current page
 * @param {number} limit - page limit
 * @returns {Object} pagination object
 */
const buildPaginationMeta = (totalCount, page, limit) => {
  const totalPages = Math.ceil(totalCount / limit) || 1;
  return {
    currentPage: page,
    limit,
    totalRecords: totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  getPaginationParams,
  buildPaginationMeta
};
