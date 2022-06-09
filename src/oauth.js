'use strict'
const ByuJwt = require('byu-jwt')
const Debug = require('debug')
const request = require('./request')

const debug = {
  auth: Debug('byu-oauth:auth-code-grant'),
  client: Debug('byu-oauth:client-grant'),
  refresh: Debug('byu-oauth:refresh'),
  revoke: Debug('byu-oauth:revoke'),
  wellKnown: Debug('byu-oauth:well-known')
}

const wellKnownObject = {}
let wellKnownTimeoutId

module.exports = async function (clientId, clientSecret, options) {
  const byuJwt = ByuJwt(options)
  await getTokenEndpoints(byuJwt.openIdConfigUrl)

  const result = Object.create(wellKnownObject)
  Object.assign(result, {
    getAuthorizationUrl,
    getClientGrantToken,
    getAuthCodeGrantToken,
    refreshToken,
    revokeToken
  })
  return result

  async function getAuthorizationUrl (redirectUri, state = '') {
    debug.auth('get authorization url')
    return this.authorizationEndpoint +
      '?response_type=code&client_id=' + clientId +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&scope=openid&state=' + encodeURIComponent(state)
  }

  async function getClientGrantToken () {
    debug.client('getting client grant access token')
    const res = await request({
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      url: this.tokenEndpoint
    })
    return evaluateTokenResult(debug.client, res)
  }

  async function getAuthCodeGrantToken (code, redirectUri) {
    debug.auth('get auth code grant token')
    const res = await request({
      body: 'grant_type=authorization_code&code=' + code + '&redirect_uri=' + encodeURIComponent(redirectUri),
      headers: {
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      url: this.tokenEndpoint
    })
    return evaluateTokenResult(debug.auth, res)
  }

  async function refreshToken (refreshToken) {
    debug.refresh('refreshing access token')
    const res = await request({
      body: 'grant_type=refresh_token&refresh_token=' + refreshToken,
      headers: {
        Authorization: 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      url: this.tokenEndpoint
    })
    return evaluateTokenResult(debug.refresh, res)
  }

  async function revokeToken (accessToken, refreshToken) {
    const promises = []
    if (accessToken) {
      debug.revoke('revoking access token')
      const promise = revoke(this, accessToken, 'access_token')
        .then(() => debug.revoke('revoked access token'))
        .catch(err => {
          debug.revoke('failed to revoke access token')
          throw err
        })
      promises.push(promise)
    }

    if (refreshToken) {
      debug.revoke('revoking refresh token')
      const promise = revoke(this, accessToken, 'refresh_token')
        .then(() => debug.revoke('revoked refresh token'))
        .catch(err => {
          debug.revoke('failed to revoke refresh token')
          throw err
        })
      promises.push(promise)
    }

    return Promise.all(promises)
  }
}

async function evaluateTokenResult (debug, res) {
  const { statusCode, body } = res
  if (statusCode === 200) {
    let time = Date.now() + 1000 * body.expires_in
    if (time > 8640000000000000) time = 8640000000000000
    debug('retrieved access token')
    const result = {
      accessToken: body.access_token,
      expiresAt: new Date(time),
      expiresIn: body.expires_in,
      scope: body.scope,
      type: body.token_type
    }
    if (body.refresh_token) result.refreshToken = body.refresh_token
    if (body.id_token) {
      try {
        const [, payload] = body.id_token.split('.')
        const decoded = JSON.parse((Buffer.from(payload, 'base64')).toString('utf8'))
        result.resourceOwner = {
          atHash: decoded.at_hash,
          aud: decoded.aud,
          authTime: decoded.auth_time,
          azp: decoded.azp,
          byuId: decoded.byu_id,
          exp: decoded.exp,
          iat: decoded.iat,
          iss: decoded.iss,
          jwt: body.id_token,
          netId: decoded.net_id,
          personId: decoded.person_id,
          prefix: decoded.prefix,
          restOfName: decoded.rest_of_name,
          sortName: decoded.sort_name,
          sub: decoded.sub,
          suffix: decoded.suffix,
          surname: decoded.surname,
          surnamePosition: decoded.surname_position
        }
      } catch (err) {
        debug('unable to decode id token: ' + err.toString)
      }
    }
    return result
  } else {
    debug('unable to get access token')
    const err = Error('Unable to get access token')
    err.statusCode = statusCode
    err.details = body
    throw err
  }
}

async function getTokenEndpoints (wellKnown) {
  // make request to open id well known url
  debug.wellKnown('get fresh well known data')
  const res = await request({ url: wellKnown })
  const data = typeof res.body === 'object' ? res.body : JSON.parse(res.body)

  // cache important data
  Object.assign(wellKnownObject, {
    authorizationEndpoint: data.authorization_endpoint,
    idTokenSigningAlgorithmValuesSupported: data.id_token_signing_alg_values_supported,
    issuer: data.issuer,
    jwksUri: data.jwks_uri,
    responseTypesSupported: data.response_types_supported,
    revocationEndpoint: data.revocation_endpoint,
    scopesSupported: data.scopes_supported,
    subjectTypesSupported: data.subject_types_supported,
    tokenEndpoint: data.token_endpoint,
    userInfoEndpoint: data.userinfo_endpoint
  })

  // determine how long the cache is good for
  let cacheDuration = 600 // 10 minute default
  if (res.headers['cache-control']) {
    const rx = /(?:^|,|\s)max-age=(\d+)(?:,|\s|$)/
    const match = rx.exec(res.headers['cache-control'])
    if (match) cacheDuration = +match[1]
  }

  // set cache timeout
  wellKnownTimeoutId = setTimeout(() => {
    debug.wellKnown('cache expired')
    getTokenEndpoints()
      .catch(err => {
        debug.wellKnown('unable to refresh well known information')
        console.error(err.stack)
      })
  }, cacheDuration * 1000)
}

function revoke (context, token, type) {
  return request({
    body: 'token=' + token + '&token_type_hint=' + type,
    headers: {
      Authorization: 'Basic ' + Buffer.from(context.clientId + ':' + context.clientSecret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    url: context.revocationEndpoint
  })
}

process.on('exit', () => clearTimeout(wellKnownTimeoutId)) // app is closing
process.on('SIGINT', () => clearTimeout(wellKnownTimeoutId)) // catches ctrl+c event
process.on('SIGBREAK', () => clearTimeout(wellKnownTimeoutId)) // catches Windows ctrl+c event
process.on('SIGUSR1', () => clearTimeout(wellKnownTimeoutId)) // catches "kill pid"
process.on('SIGUSR2', () => clearTimeout(wellKnownTimeoutId)) // catches "kill pid"
