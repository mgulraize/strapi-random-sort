module.exports = async (ctx, next) => {
  try {
    // Check if random sorting is requested - handle both URL and query object formats
    const isRandomRequested =
      ctx?.request?.url?.includes("random=true") ||
      ctx?.query?.random === "true";

    if (isRandomRequested) {
      // Use Strapi v4's official way to get all results
      ctx.query = {
        ...ctx.query,
        pagination: {
          pageSize: -1, // -1 means all results in Strapi v4
          page: 1,
        },
      };
    }

    await next();

    if (isRandomRequested && ctx.body?.data) {
      shuffleArray(ctx.body.data);
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
