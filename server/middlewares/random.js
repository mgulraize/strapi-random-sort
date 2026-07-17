'use strict';

/**
 * Fisher-Yates shuffle algorithm for randomizing array order
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array (new array, original not mutated)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Random sort middleware for Strapi v4/v5
 * Adds ?random=true query param support to randomly shuffle collection results
 */
module.exports = async (ctx, next) => {
  try {
    // Check if random sorting is requested
    const isRandomRequested =
      ctx?.request?.url?.includes('random=true') ||
      ctx?.query?.random === 'true';

    if (isRandomRequested) {
      // Extract original pagination values
      let requestedPage = 1;
      let requestedPageSize = 10;

      if (ctx.query.pagination) {
        if (typeof ctx.query.pagination === 'object') {
          requestedPage = parseInt(ctx.query.pagination.page) || 1;
          requestedPageSize = parseInt(ctx.query.pagination.pageSize) || 10;
        }
        delete ctx.query.pagination;
      }
      if (ctx.query['pagination[page]']) {
        requestedPage = parseInt(ctx.query['pagination[page]']) || 1;
        delete ctx.query['pagination[page]'];
      }
      if (ctx.query['pagination[pageSize]']) {
        requestedPageSize = parseInt(ctx.query['pagination[pageSize]']) || 10;
        delete ctx.query['pagination[pageSize]'];
      }

      // Remove offset pagination if present
      delete ctx.query.start;
      delete ctx.query.limit;

      // Clean pagination params from URL query string
      const [baseUrl, queryString] = ctx.request.url.split('?');
      if (queryString) {
        const newQueryString = queryString
          .split('&')
          .filter(
            (param) =>
              !param.startsWith('pagination[') &&
              !param.startsWith('start=') &&
              !param.startsWith('limit=') &&
              !param.startsWith('page=') &&
              !param.startsWith('pageSize=')
          )
          .join('&');
        ctx.request.url = newQueryString
          ? `${baseUrl}?${newQueryString}`
          : baseUrl;
      }

      // Set large pageSize to get all results
      ctx.query.pagination = {
        pageSize: 100000,
        page: 1,
      };

      // Store requested values for use after next()
      ctx.state._randomSortRequestedPage = requestedPage;
      ctx.state._randomSortRequestedPageSize = requestedPageSize;
    }

    await next();

    if (isRandomRequested && ctx.body?.data) {
      if (Array.isArray(ctx.body.data)) {
        // REST response: data is a flat array. Shuffle, then paginate to
        // the page/pageSize the caller originally asked for.
        const shuffledData = shuffleArray(ctx.body.data);

        const page = ctx.state._randomSortRequestedPage || 1;
        const pageSize = ctx.state._randomSortRequestedPageSize || 10;
        const total = shuffledData.length;
        const pageCount = Math.ceil(total / pageSize);

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        ctx.body.data = shuffledData.slice(start, end);

        if (ctx.body.meta && ctx.body.meta.pagination) {
          ctx.body.meta.pagination = {
            page,
            pageSize,
            pageCount,
            total,
          };
        }
      } else if (typeof ctx.body.data === 'object') {
        // GraphQL response: data is an object keyed by query/operation name,
        // e.g. `{ restaurants: [...] }` (default flattened v5 format) or
        // `{ restaurants_connection: { data: [...], meta: {...} } }`
        // (Relay-style `_connection` variant). GraphQL resolves its own
        // pagination from the query/variables, which this middleware can't
        // see at the Koa layer, so there's no "fetch everything, then
        // repaginate" pass here - this only shuffles whatever page GraphQL
        // already returned.
        for (const key of Object.keys(ctx.body.data)) {
          const value = ctx.body.data[key];
          if (Array.isArray(value)) {
            ctx.body.data[key] = shuffleArray(value);
          } else if (value && typeof value === 'object' && Array.isArray(value.data)) {
            value.data = shuffleArray(value.data);
          }
        }
      }
    }
  } catch (error) {
    console.error('[random-sort] Middleware error:', error);
    // Continue with the request even if there's an error
    if (!ctx.body) {
      await next();
    }
  }
};
