import {
  AppToken as AppTokenV2,
  getAppToken as getAppTokenV2} from './auth_v2'

import {
  AppToken as AppTokenV3,
  AccessToken as AccessTokenV3,
  Client as ClientV3,
  oauthFlow,
  registerClient,
  getAuthCodeURL,
  updateClient,
  unregisterClient,
  getAccessToken,
  refreshToken,
  getClient,
  CredsKey
} from './auth_v3'

import {LocalStorage, MemoryStorage} from './auth_storage'

const AuthNone = 0
const AuthRunning = 1
const AuthError = 2
const AuthOK = 3

const defaultClientParams = {
  softwareID: 'github.com/cozy/cozy-client-js'
}

export default class AuthManager {
  constructor (cozy) {
    this.cozy = cozy
    this._oauth = false // is oauth activated or not
    this._token = null  // application token
    this._authstate = AuthNone
    this._authcreds = null
    this._storage = null

    this.Client = ClientV3
    this.AccessToken = AccessTokenV3
    this.AppToken = AppTokenV3
    this.AppTokenV2 = AppTokenV2
    this.LocalStorage = LocalStorage
    this.MemoryStorage = MemoryStorage
  }

  init (options) {
    const token = options.token
    const oauth = options.oauth
    if (token && oauth) {
      throw new Error('Cannot specify an application token with a oauth activated')
    }

    if (token) {
      this._token = new AppTokenV3({ token })
    } else if (oauth) {
      this._oauth = true
      this._storage = oauth.storage || new LocalStorage()
      this._clientParams = Object.assign({}, defaultClientParams, oauth.clientParams)
      this._onRegistered = oauth.onRegistered || nopOnRegistered
    }
  }

  authorize () {
    const state = this._authstate
    if (state === AuthOK || state === AuthRunning) {
      return this._authcreds
    }

    this._authstate = AuthRunning
    this._authcreds = this.cozy.isV2().then((isV2) => {
      if (isV2 && this._oauth) {
        throw new Error('OAuth is not supported on the V2 stack')
      }
      if (this._oauth) {
        return oauthFlow(
          this,
          this._storage,
          this._clientParams,
          this._onRegistered
        )
      }
      // we expect to be on a client side application running in a browser
      // with cookie-based authentication.
      if (isV2) {
        return getAppTokenV2()
      } else if (this._token) {
        return Promise.resolve({client: null, token: this._token})
      } else {
        throw new Error('Missing application token')
      }
    })

    this._authcreds.then(
      () => { this._authstate = AuthOK },
      () => { this._authstate = AuthError })

    return this._authcreds
  }

  saveCredentials (client, token) {
    const creds = {client, token}
    if (!this._storage || this._authstate === AuthRunning) {
      return Promise.resolve(creds)
    }
    this._storage.save(CredsKey, creds)
    this._authcreds = Promise.resolve(creds)
    return this._authcreds
  }

  registerClient (...args) {
    return registerClient(this.cozy, ...args)
  }

  getAuthCodeURL (...args) {
    return getAuthCodeURL(this.cozy, ...args)
  }

  updateClient (...args) {
    return updateClient(this.cozy, ...args)
  }

  getAccessToken (...args) {
    return getAccessToken(this.cozy, ...args)
  }

  refreshToken (...args) {
    return refreshToken(this.cozy, ...args)
  }

  unregisterClient (...args) {
    return unregisterClient(this.cozy, ...args)
  }

  getClient (...args) {
    return getClient(this.cozy, ...args)
  }

}

function nopOnRegistered () {
  throw new Error('Missing onRegistered callback')
}
