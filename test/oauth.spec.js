'use strict'
/* global describe beforeAll afterAll it expect */

process.env.DEBUG = 'wabs*'
const Oauth = require('../index')
const http = require('http')
const puppeteer = require('puppeteer')
const { default: EnvSsm } = require('@byu-oit/env-ssm')
const { SSM } = require('@aws-sdk/client-ssm')

process.on('unhandledRejection', err => {
  console.error(err.stack)
})

// Requires login to the byu-oit-devx-prd AWS account.
// `aws sso login --profile byu-oit-devx-prd`
// The following environment variables need to be set
// AWS_PROFILE=byu-oit-devx-prd

describe('byu-wabs-oauth', function () {
  let config
  let oauth

  // get WSO2 credentials from AWS parameter store
  beforeAll(async () => {
    const ssm = new SSM({ region: 'us-west-2' })
    const env = await EnvSsm({ ssm, paths: ['/byu-wabs-oauth'], processEnv: false })
    config = {
      key: env.get('consumer_key').required().asString(),
      secret: env.get('consumer_secret').required().asString(),
      callback: env.get('callback_url').required().asString(),
      netId: env.get('net_id').required().asString(),
      password: env.get('password').required().asString()
    }
    oauth = await Oauth(config.key, config.secret)
  })

  describe('getClientGrantToken', () => {
    it('can get token', async () => {
      const token = await oauth.getClientGrantToken()
      expect(typeof token.accessToken).toBe('string')
    })
  })

  describe('getCodeGrantToken', () => {
    let listener
    let token

    beforeAll(function (done) {
      const port = parseInt(new URL(config.callback).port)

      // start a server that will listen for the OAuth code grant redirect
      const server = http.createServer((req, res) => {
        const match = /^\/\?code=(.+)$/.exec(req.url)
        if (match) {
          const [, code] = match
          res.statusCode = 200
          oauth.getAuthCodeGrantToken(code, config.callback.toString())
            .then(t => {
              token = t
              res.end()
            })
            .catch(err => {
              console.error(err.stack)
              res.statusCode = 500
              res.write(err.stack)
              res.end()
            })
        } else {
          res.statusCode = 400
          res.end()
        }
      })

      listener = server.listen(port, done)
    })

    // start the browser and log in
    beforeAll(async function () {
      token = null
      const url = await oauth.getAuthorizationUrl(config.callback)
      const browser = await puppeteer.launch({ headless: true })
      const page = await browser.newPage()
      await page.goto(url) // go to API manager which will redirect to CAS
      await page.waitForSelector('#username') // wait for CAS page load
      await page.type('#username', config.netId)
      await page.type('#password', config.password)
      await page.click('input[type=submit]') // navigates back to API manager
      await page.waitForNavigation({ timeout: 3000 }) // wait for redirect back to localhost

      await new Promise(resolve => {
        const intervalId = setInterval(() => {
          if (token !== null) {
            clearInterval(intervalId)
            resolve()
          }
        })
      })

      // close the browser
      await browser.close()
    }, 10000)

    afterAll(async () => {
      // shut down the server
      await listener.close()
    })

    it('can get token', () => {
      expect(typeof token.accessToken).toBe('string')
    })

    it('has correct identity', () => {
      expect(token.resourceOwner.sortName).toEqual('Ithica, Oauth')
    })

    it('can refresh token', async () => {
      const before = { accessToken: token.accessToken, refreshToken: token.refreshToken }
      token = await oauth.refreshToken(token.refreshToken)
      const after = { accessToken: token.accessToken, refreshToken: token.refreshToken }
      expect(typeof token.accessToken).toBe('string')
      expect(after.accessToken).not.toEqual(before.accessToken)
      expect(after.refreshToken).not.toEqual(before.refreshToken)
    })

    it('can revoke token', async () => {
      expect(async () => await oauth.revokeToken(token.accessToken, token.refreshToken)).not.toThrow()
    })
  })
})
