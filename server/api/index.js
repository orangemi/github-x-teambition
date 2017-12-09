const qs = require('qs')
const assert = require('assert')
const config = require('config')
const urllib = require('urllib')
const GitHub = require('github')
const Router = require('koa-router')
const parser = require('koa-body')
const router = module.exports = new Router()

router.get('/', checkgithub(), async (ctx) => {
  ctx.body = 'this is root'
})

router.all('/createHook', checkgithub(), async (ctx) => {
  const {githubToken} = ctx.session
  const github = new GitHub()
  const owner = ctx.query.ownder || 'orangemi'
  const repo = ctx.query.repo || 'github-x-teambition'
  github.authenticate({
    type: 'oauth',
    token: githubToken
  })
  await github.repos.createHook({
    owner: owner,
    repo: repo,
    name: 'web',
    config: {
      url: config.WEBHOOK_URL + '/' + owner + '/' + repo,
      content_type: 'json'
    },
    events: ['push'],
    active: true
  })
  ctx.body = {}
})

router.all('/webhooks/:repo(.*)', parser(), async (ctx) => {
  const {repo} = ctx.params
  const {body} = ctx.request
  console.log('webhook', repo, body)
  ctx.body = {}
})

router.get('/callback', async (ctx) => {
  const code = ctx.query.code
  const url = `https://github.com/login/oauth/access_token`
  const body = {
    client_id: config.GITHUB_CLIENT_ID,
    client_secret: config.GITHUB_CLIENT_SECRET,
    code: code
  }
  const resp = await urllib.request(url, {
    method: 'post',
    contentType: 'json',
    dataType: 'json',
    data: body
  })
  if (resp.status !== 200) ctx.throw(500, 'github callback error')
  assert(resp.data)
  assert(resp.data.access_token)
  ctx.session.githubToken = resp.data.access_token
  ctx.redirect('/')
})

function checkgithub () {
  return async (ctx, next) => {
    if (!ctx.session.githubToken) {
      const query = {
        client_id: config.GITHUB_CLIENT_ID,
        redirect_uri: config.HOST + '/callback',
        scope: 'repo'
      }
      const url = 'https://github.com/login/oauth/authorize?' + qs.stringify(query)
      ctx.redirect(url)
      return
    }
    return next()
  }
}
