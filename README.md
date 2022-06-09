# byu-wabs-oauth

Manage OAuth client grant and auth code grant access tokens for BYU's implementation of WSO2.

## Table of Contents

- [Installation](#installation)
- [Examples](#examples)
    - [Client Grant Token](#client-grant-token)
    - [Code Grant Token](#code-grant-token)
- [Create a BYU OAuth object](#create-a-byu-oauth-object)
- [BYU OAuth Object](#byu-oauth-object)
    - [getAuthorizationUrl](#getauthorizationurl)
    - [getClientGrantToken](#getclientgranttoken)
    - [getAuthCodeGrantToken](#getauthcodegranttoken)
    - [refreshToken](#refreshtoken)
    - [revokeToken](#revoketoken)
- [BYU OAuth Token](#byu-oauth-token)
- [Testing](#testing)

## Installation

```sh
$ npm install byu-wabs-oauth
```

## Examples

### Client Grant Token

Use this grant type for communicating from one server to another where a specific user’s permission to access data is
not required.

```js
const byuOAuth = require('byu-wabs-oauth')

;(async function () {
  const oauth = await byuOAuth('<client_id>', '<client_secret>')
  const token = await oauth.getClientGrantToken()
})()
```

### Auth Code Grant Token

Use this grant type if you need the user's authorization to access data. Getting this grant type is a two step process.

1. Direct the user to the authorization URL
2. Get the token using the authorization code that comes in a follow up request

```js
const byuOAuth = require('byu-wabs-oauth')
const querystring = require('querystring')
const redirectUrl = 'http://localhost:3000/'

// start a server that will listen for the OAuth code grant redirect
const server = http.createServer(async (req, res) => {
  const oauth = await byuOAuth('<client_id>', '<client_secret>')
  const qs = querystring.parse(req.url.split('?')[1] || '')

  // if there is no code then redirect browser to authorization url
  if (!qs.code) {
    const url = await oauth.getAuthorizationUrl(redirectUrl)
    res.setHeader('Location', url)
    res.end()

    // if there is a code then use the code to get the code grant token
  } else {
    const token = await oauth.getCodeGrantToken(qs.code, redirectUrl)
    res.write(token.accessToken)
    res.end()
  }
});

const listener = server.listen(3000)
```

## Create a BYU OAuth object

`byuWabsOAuth (clientId: string, clientSecret: string, options: ByuJWT.Options) : Promise<ByuOAuth>`

**Parameters**

| Parameter        | Type             | Required | Description                                                                                                                  |
|------------------|------------------|----------|------------------------------------------------------------------------------------------------------------------------------|
| **clientId**     | `string`         | Yes      | The client ID or consumer key                                                                                                |
| **clientSecret** | `string`         | Yes      | The client secret or consumer secret                                                                                         |
| **options**      | `ByuJWT.Options` | No       | The [ByuJWT Options](https://github.com/byu-oit/byu-jwt-nodejs/blob/8d3fe95170c7b2f1a149e29c8123946586d3daa4/index.d.ts#L12) |

**Returns** a Promise that resolves to an object with the following methods and properties:

Methods:

- [getAuthorizationUrl](#getauthorizationurl) - Get the URL that will provide an OAuth code grant code.
- [getClientGrantToken](#getclientgranttoken) - Get a client grant [token](#byu-oauth-token). Use this grant type for
  communicating from one server to another where a specific user’s permission to access data is not required.
- [getAuthCodeGrantToken](#getauthcodegranttoken) - Get a code grant [token](#byu-oauth-token). Use this grant type if
  you need the user's authorization to access data.
- [refreshToken](#refreshtoken) - Use a refresh token to get a new [token](#byu-oauth-token) object.
- [revokeToken](#revoketoken) - Use to revoke an access token and / or refresh token.

Properties:

- authorizationEndpoint
- idTokenSigningAlgorithmValuesSupported
- issuer
- jwksUri
- responseTypesSupported
- revocationEndpoint
- scopesSupported
- subjectTypesSupported
- tokenEndpoint
- userInfoEndpoint

**Example**

```js
const byuOAuth = require('byu-wabs-oauth')
const oauth = await byuOauth('<client_id>', '<client_secret>')
```

### getAuthorizationUrl

`getAuthorizationUrl ( redirectUri: string [, state: string ] ): Promise<string>`

Get the URL that needs to be visited to acquire an auth code grant code.

**Parameters**

| Parameter       | Type     | Required | Description                                                                                                |
|-----------------|----------|----------|------------------------------------------------------------------------------------------------------------|
| **redirectUri** | `string` | Yes      | The URL that the API manager will redirect to after the user has authorized the application.               |
| state           | `string` | No       | State information to add to the URL. You can read this state information when the `redirectUri` is called. |

**Returns** a Promise that resolves to the URL.

**Example**

```js
;(async () => {
  const byuOAuth = require('byu-wabs-oauth')
  const oauth = await byuOauth('<client_id>', '<client_secret>')

  const url = await oauth.getAuthorizationUrl('https://my-server.com', 'state info')
})()
```

### getClientGrantToken

`getClientGrantToken (): Promise<Token>`

Get a client grant [token](#byu-oauth-token).

**Parameters**

None

**Returns** a Promise that resolves to a [token](#byu-oauth-token).

**Example**

```js
;(async () => {
  const byuOAuth = require('byu-wabs-oauth')
  const oauth = await byuOauth('<client_id>', '<client_secret>')

  const token = await oauth.getClientGrantToken()
})()
```

### getAuthCodeGrantToken

`getAuthCodeGrantToken ( code: string, redirectUri: string): Promise<Token>`

Get a code grant [token](#byu-oauth-token).

**Parameters**

| Parameter       | Type     | Required | Description                                                                                       |
|-----------------|----------|----------|---------------------------------------------------------------------------------------------------|
| **code**        | `string` | Yes      | The code grant code that signifies authorization                                                  |
| **redirectUri** | `string` | Yes      | The original URI specified when calling the [getAuthorizationUrl](#getauthorizationurl) function. |

**Returns** a Promise that resolves to a [token](#byu-oauth-token).

**Example**

See the [Code Grant Token example](#code-grant-token).

### refreshToken

`refreshToken ( refreshToken: string ): Promise<Token>`

Get a new access token using a refresh token.

**Parameters**

| Parameter        | Type     | Required  | Description                   |
|------------------|----------|-----------|-------------------------------|
| **accessToken**  | `string` | Yes       | The access token to refresh.  |
| **refreshToken** | `string` | Yes       | The associated refresh token. |

**Returns** a Promise that resolves to a [token](#byu-oauth-token).

**Example**

```js
;(async () => {
  const byuOAuth = require('byu-wabs-oauth')
  const oauth = await byuOauth('<client_id>', '<client_secret>')

  const token = await oauth.refreshToken('<access_token>', '<refresh_token>')
})()
```

### revokeToken

`revokeToken ( accessToken: string [, refreshToken: string ] ): Promise<void>`

Revoke an access token and / or a refresh token.

**Parameters**

| Parameter       | Type     | Required | Default | Description                                  |
|-----------------|----------|----------|---------|----------------------------------------------|
| **accessToken** | `string` | Yes      | N/A     | The access token to revoke.                  |
| refreshToken    | `string` | No       | N/A     | The associated refresh token to also revoke. |

**Returns** a Promise that resolves to undefined.

**Example**

```js
;(async () => {
  const byuOAuth = require('byu-wabs-oauth')
  const oauth = await byuOauth('<client_id>', '<client_secret>')
  await oauth.revokeToken('<access_token>', '<refresh_token>')
})()
```

## BYU OAuth Token

This object has information about the current token as well as methods for managing the token. These are the properties:

- accessToken - A string that has the most recent access token. This value will be `undefined` if the token has been
  revoked.
- expiresAt - A Date object that represents when the token will expire.
- expiresIn - The number of milliseconds until the token expires.
- refreshToken - A string representing the refresh token. This value will be `undefined` for client grant tokens,
  although client grant tokens can still be refreshed using the `refresh` function on this object.
- resourceOwner - Only valid for code grant tokens, this object contains the resource owner's properties:
    - atHash: string
    - aud: Array<string>
    - authTime: number
    - azp: string
    - byuId: string
    - exp: number
    - iat: number
    - iss: string
    - jwt: string
    - netId: string
    - personId: string
    - preferredFirstName: string
    - prefix: string
    - restOfName: string
    - sortName: string
    - sub: string
    - suffix: string
    - surname: string
    - surnamePosition: string
- scope - A string representing the scopes associated with this token.
- type - A string of the token type.

## Testing

#### Run the tests

1. In the terminal, log into the BYU DevX AWS Account

  ```shell
  aws sso login --profile byu-oit-devx-prd
  ```

2. In this root of this project, run:

  ```shell 
  npm install
  npm test
  ```

#### Update environment variables used in the tests

1. Create the file `./iac/vars.tfvars`.
2. Copy this template into that file.

  ```terraform
  consumer_key  = ""
consumer_secret = ""
callback_url    = ""
net_id          = ""
password        = ""
  ```

3. Copy and paste the values from the parameter store into this file.
4. Update the values you want to change.
5. Set the AWS_PROFILE environment variable.

  ```shell
  export AWS_PROFILE=byu-oit-devx-prd
  ```

6. Login to the BYU DevX AWS Account.

  ```shell
  aws sso login --profile $AWS_PROFILE
  ```

7. From within the `./iac` directory, apply the changes in Terraform.

> Ensure you use same version of terraform (as of right now v1.2.2 is latest).

  ```shell
  terraform init
  terraform apply --var-file vars.tfvars
  ```
