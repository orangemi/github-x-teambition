module.exports = (options = {}) => async (ctx, next) => {
  const start = Date.now()
  try {
    await next()
  } catch (e) {
    console.error(e)
    // ignore here.
  }
  console.log(ctx.method, ctx.url, ctx.status, Date.now() - start)
}
