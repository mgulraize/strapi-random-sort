module.exports = async (ctx, next) => {

  await next();

  // only if query param random=true from ctx.request.url
  //parse url
  const queryParams = ctx?.request?.url?.split("?")[1]?.split("&");
  if (!queryParams) {
    return;
  }
  if (queryParams.includes("random=true")) {
    shuffleArray(ctx.body);
  }
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
};
