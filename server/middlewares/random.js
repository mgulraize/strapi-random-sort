module.exports = async (ctx, next) => {
  try {
    // Check if random sorting is requested - handle both URL and query object formats
    const isRandomRequested =
      ctx?.request?.url?.includes("random=true") ||
      ctx?.query?.random === "true";

    if (isRandomRequested) {
      // Extract original pagination values
      let requestedPage = 1;
      let requestedPageSize = 10; // Default

      if (ctx.query.pagination) {
        if (typeof ctx.query.pagination === "object") {
          requestedPage = parseInt(ctx.query.pagination.page) || 1;
          requestedPageSize = parseInt(ctx.query.pagination.pageSize) || 10;
        }
        // Remove original pagination
        delete ctx.query.pagination;
      }
      if (ctx.query["pagination[page]"]) {
        requestedPage = parseInt(ctx.query["pagination[page]"]) || 1;
        delete ctx.query["pagination[page]"];
      }
      if (ctx.query["pagination[pageSize]"]) {
        requestedPageSize = parseInt(ctx.query["pagination[pageSize]"]) || 10;
        delete ctx.query["pagination[pageSize]"];
      }

      // Remove offset pagination if present
      delete ctx.query.start;
      delete ctx.query.limit;

      // Remove pagination params from the URL query string
      const [baseUrl, queryString] = ctx.request.url.split("?");
      if (queryString) {
        const newQueryString = queryString
          .split("&")
          .filter(
            (param) =>
              !param.startsWith("pagination[") &&
              !param.startsWith("start=") &&
              !param.startsWith("limit=") &&
              !param.startsWith("page=") &&
              !param.startsWith("pageSize=")
          )
          .join("&");
        ctx.request.url = newQueryString
          ? `${baseUrl}?${newQueryString}`
          : baseUrl;
      }

      // Set a very large pageSize to get all results
      ctx.query.pagination = {
        pageSize: 100000, // Set this higher if you have more records
        page: 1,
      };

      // Store requested values for use after next()
      ctx.state._randomSortRequestedPage = requestedPage;
      ctx.state._randomSortRequestedPageSize = requestedPageSize;
    }

    await next();

    if (isRandomRequested && ctx.body?.data) {
      // Shuffle all records
      shuffleArray(ctx.body.data);

      // Paginate the shuffled array
      const page = ctx.state._randomSortRequestedPage || 1;
      const pageSize = ctx.state._randomSortRequestedPageSize || 10;
      const total = ctx.body.data.length;
      const pageCount = Math.ceil(total / pageSize);

      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      ctx.body.data = ctx.body.data.slice(start, end);

      // Update meta.pagination
      if (ctx.body.meta && ctx.body.meta.pagination) {
        ctx.body.meta.pagination = {
          page,
          pageSize,
          pageCount,
          total,
        };
      }
    }
  } catch (error) {
    console.error("Error in random sort middleware:", error);
    // Continue with the request even if there's an error
    await next();
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
};
