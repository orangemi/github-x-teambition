module.exports = (options = {}) => async (ctx, next) => {
  const start = Date.now()
  await next()
  console.log(ctx.method, ctx.url, ctx.status, Date.now() - start)
}
