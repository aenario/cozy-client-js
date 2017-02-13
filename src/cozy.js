/* global fetch */
import {retry, warn, removeTrailingSlash, addToProto} from './utils'

import {cozyFetch, cozyFetchJSON} from './fetch'

import * as crud from './crud'
import * as mango from './mango'
import * as relations from './relations'

import FilesAPI from './files'
import SettingsAPI from './settings'
import OfflineAPI from './offline'
import AuthManager from './auth/index'

export default class Cozy {
  constructor (options) {
    this._inited = false

    this.settings = new SettingsAPI(this, options)
    this.offline = new OfflineAPI(this, options)
    this.auth = new AuthManager(this, options)
    this.files = new FilesAPI(this, options)

    addToProto(this, this, {
      create: crud.create,
      find: crud.find,
      update: crud.update,
      delete: crud._delete,
      updateAttributes: crud.updateAttributes,
      defineIndex: mango.defineIndex,
      query: mango.query,
      addReferencedFiles: relations.addReferencedFiles,
      listReferencedFiles: relations.listReferencedFiles,
      destroy: function (...args) {
        warn('destroy is deprecated, use cozy.delete instead.')
        return crud._delete(...args)
      }
    }, this._disablePromises)

    if (options) this.init(options)
  }

  fetch (...args) {
    cozyFetch(this, ...args)
  }

  fetchJSON (...args) {
    cozyFetchJSON(this, ...args)
  }

  init (options = {}) {
    this._inited = true
    this._url = removeTrailingSlash(options.cozyURL || '')
    this._version = retry(() => fetch(`${this._url}/status/`), 3)()
      .then((res) => {
        if (!res.ok) {
          throw new Error('Could not fetch cozy status')
        } else {
          return res.json()
        }
      })
      .then((status) => status.datasystem !== undefined)

    this.auth.init(options)

    if (options.offline) {
      this.offline.init(options.offline)
    }
  }

  isV2 () {
    return this._version
  }
}
