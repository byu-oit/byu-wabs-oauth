'use strict'
const debug = require('debug')('byu-oauth:request')
const http = require('http')
const https = require('https')

const rxJson = /^application\/(?:[^+]+\+)?json(?:;|$)/
const rxUrl = /^(https?):\/\/([^:/?]+)(?::(\d+))?([/?].*)?$/

module.exports = function (options) {
  return new Promise((resolve, reject) => {
    // validate input parameters
    if (!options) return reject(Error('Missing require parameter: options'))
    if (Object.hasOwnProperty.call(options, 'body') && typeof options.body !== 'object' && typeof options.body !== 'string') return reject(Error('Options "body" property must be a string or object'))
    if (Object.hasOwnProperty.call(options, 'headers') && typeof options.headers !== 'object') return reject(Error('Options "headers" property must be an object'))
    if (Object.hasOwnProperty.call(options, 'method') && typeof options.method !== 'string') return reject(Error('Options "method" property must be a string'))
    if (Object.hasOwnProperty.call(options, 'query') && typeof options.query !== 'object') return reject(Error('Options "query" property must be an object'))
    if (typeof options.url !== 'string') return reject(Error('Options "url" property must be a string'))

    // add default options values
    if (!options.method) options.method = 'GET'
    options.method = options.method.toUpperCase()

    const match = rxUrl.exec(options.url)
    if (!match) return reject(Error('Invalid URL specified'))
    let [, protocol, hostname, port, path] = match

    // finish building the path
    if (!path.startsWith('/')) path = '/' + path
    if (options.query) {
      let first = path.indexOf('?') !== -1
      Object.keys(options.query).forEach(key => {
        path += (first ? '?' : '&') + key + '=' + encodeURIComponent(options.query[key])
        first = false
      })
    }

    // lower case all headers
    const headers = {}
    if (options.headers) {
      Object.keys(options.headers).forEach(key => {
        headers[key.toLowerCase()] = options.headers[key]
      })
    }

    // if the body is an object and there is no content-type then convert to application/json
    let body
    if (Object.hasOwnProperty.call(options, 'body')) body = options.body

    const config = {
      hostname,
      port: port || (protocol === 'http' ? 80 : 443),
      method: options.method ? options.method.toUpperCase() : 'GET',
      path,
      headers
    }
    const signature = config.method + ' ' + config.hostname + (port ? ':' + port : '') + config.path
    debug('request to ' + signature + ' initialized')

    const req = (protocol === 'http' ? http : https).request(config, res => {
      debug('request to ' + signature + ' receiving response code: ' + res.statusCode)
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => {
        body += chunk
      })
      res.on('end', () => {
        try {
          if (body && rxJson.test(res.headers['content-type'])) body = JSON.parse(body)
          resolve({
            body,
            headers: res.headers,
            statusCode: res.statusCode
          })
        } catch (err) {
          reject(err)
        }
      })
    })

    req.on('error', err => {
      debug('request to ' + signature + ' has error: ' + err.stack)
      reject(err)
    })

    if (body !== undefined) req.write(body)
    req.end()
  })
}
