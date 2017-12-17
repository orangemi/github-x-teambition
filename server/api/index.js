const qs = require('qs')
const assert = require('assert')
const config = require('config')
const urllib = require('urllib')
const GitHub = require('github')
const Router = require('koa-router')
const parser = require('koa-body')
const router = module.exports = new Router()

const db = require('../model')

const regexString = config.TEAMBITION_HOST.replace(/\./g, '\\.') + '/project/([0-9a-f]{24})/tasks/scrum/([0-9a-f]{24})/task/([0-9a-f]{24})'
const regex = new RegExp(regexString, 'g')

router.get('/', checkgithub(), async (ctx) => {
  ctx.body = 'this is root'
})

router.all('/createHook', checkgithub(), async (ctx) => {
  const {githubToken} = ctx.session
  const github = new GitHub()
  const owner = ctx.query.ownder || 'orangemi'
  const repo = ctx.query.repo || 'github-x-teambition'
  const organizationId = ctx.query.organizationId || '50c32afae8cf1439d35a87e6'
  github.authenticate({
    type: 'oauth',
    token: githubToken
  })
  const runner = await db.repoRunner.create({
    organizationId: organizationId,
    owner: owner,
    repo: repo
  })
  await github.repos.createHook({
    owner: owner,
    repo: repo,
    name: 'web',
    config: {
      url: config.WEBHOOK_URL + '/' + runner._id,
      content_type: 'json'
    },
    events: ['push'],
    active: true
  })
  ctx.body = {}
})

router.all('/webhooks/:runnerId([a-f0-9]{24})', parser(), async (ctx) => {
  const {runnerId} = ctx.params
  const {body} = ctx.request

  const repo = body.repository
  const commits = body.commits

  if (!repo || !commits) {
    ctx.status = 204
    return
  }

  const headCommit = commits[0]
  const committer = headCommit.committer

  const taskUrls = []
  commits.forEach(commit => {
    const urls = String(commit.message).match(regex) || []
    urls.forEach(url => {
      if (!~taskUrls.indexOf(url)) taskUrls.push(url)
    })
  })

  // const taskIds = taskUrls.map(url => /[a-f0-9]{24}$/.exec(url)[0])

  // find task id in head commit message: headCommit.message
  // like `http://project.ci/project/59fc0d38ac5bc04bc9590f51/tasks/scrum/59fc0d38ac5bc04bc9590f70/task/5a0958be98462c2c2dda7853`
  // like `https://www.teambition.com/project/59fc0d38ac5bc04bc9590f51/tasks/scrum/59fc0d38ac5bc04bc9590f70/task/5a0958be98462c2c2dda7853`
  // (HOST)/project/:projectId([0-9z-f]{24})/tasks/scrum/([0-9z-f]{24})/task/:taskId([0-9z-f]{24})
  // taskId = request(tb-search)
  // post(tasks/taskId/activity)

  // teambition API should with teambition access_token
  const message = createMessage(repo, commits, committer)

  for (const taskUrl of taskUrls) {
    const runner = await db.repoRunner.findOne({_id: runnerId})
    const url = config.TEAMBITION_HOST + '/appstore/api/developer/chats/message'
    const taskId = /[a-f0-9]{24}$/.exec(taskUrl)[0]
    try {
      const resp = await urllib.request(url, {
        headers: {'x-api-key': config.TEAMBITION_MESSAGE_ROBOT_KEY},
        method: 'post',
        contentType: 'json',
        data: {
          toType: 'object',
          _organizationId: runner.organizationId, // config.TEAMBITION_ORGANIZATION_ID,
          object: { _id: taskId, type: 'task' },
          // projects: [config.TEAMBITION_SALES_FINANCE_PROJECT_ID],
          messageType: 'text',
          text: message
        },
        dataType: 'json'
      })
      console.log(url, taskId, resp.status, resp.data)
    } catch (e) {
      console.error('post error', e)
    }
  }

  ctx.status = 204
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

function createMessage (repo, commits, committer) {
  /*
    message:
      commiter: {username} {xxx@yyy.zzz}

      commits:
      [commit.sha](commit.url)
      [commit.sha](commit.url)
      [commit.sha](commit.url)
      [commit.sha](commit.url)
      ...

  */
  const lines = []
  lines.push(`Git Commit For [${repo.full_name}](${repo.html_url})`)
  lines.push(`commiter: ${committer.username} ${committer.email} `)
  lines.push('')
  commits.map(commit => `[${commit.id.substring(0, 7)}](${commit.url}) ${commit.message.substring(0, 20)}`).forEach(line => lines.push(line))
  return lines.join('\n')
}
