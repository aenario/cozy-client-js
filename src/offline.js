import PouchDB from 'pouchdb'
import pouchdbFind from 'pouchdb-find'
import { DOCTYPE_FILES } from './doctypes'

let pluginLoaded = false

export default class Offline {

  constructor (cozy) {
    this.cozy = cozy
    this._dbs = {}
  }

  init ({ options = {}, doctypes = [], timer = false }) {
    for (let doctype of doctypes) {
      this.createDatabase(doctype, options)
    }
    if (timer) { this.startAllSync(timer) }
  }

  createDatabase (doctype, options = {}, timer = false) {
    if (!pluginLoaded) {
      PouchDB.plugin(pouchdbFind)
      pluginLoaded = true
    }
    this._dbs[doctype] = this._dbs[doctype] || {}
    let offline = this._dbs[doctype]
    if (offline && offline.database) { return offline.database }
    offline.database = new PouchDB(doctype, options)
    offline.timer = timer
    offline.autoSync = null
    if (timer) { this.startSync(doctype, timer) }
    createIndexes(this.cozy, offline.database, doctype)
    return offline.database
  }

  hasDatabase (doctype) {
    return doctype in this._dbs &&
      this._dbs[doctype].database !== undefined
  }

  getDatabase (doctype) {
    if (this.hasDatabase(doctype)) {
      return this._dbs[doctype].database
    }
    return
  }

  destroyDatabase (doctype) {
    if (this.hasDatabase(doctype)) {
      this.stopSync(doctype)
      this.getDatabase(doctype).destroy()
    }
  }

  getDoctypes () {
    if (this._dbs === null) { return [] }
    return Object.keys(this._dbs)
  }

  //
  // SYNC
  //

  startAllSync (timer) {
    if (timer) {
      const doctypes = this.getDoctypes()
      doctypes.forEach((doctype) => {
        this.startSync(doctype, timer)
      })
    }
  }

  stopAllSync () {
    const doctypes = this.getDoctypes()
    doctypes.forEach((doctype) => {
      this.stopSync(doctype)
    })
  }

  startSync (doctype, timer) {
    // TODO: add timer limitation for not flooding Gozy
    if (this.hasDatabase(doctype)) {
      if (this.hasSync(doctype)) {
        if (timer === this._dbs[doctype].timer) { return }
        this.stopSync(doctype)
      }
      let offline = this._dbs[doctype]
      offline.timer = timer
      offline.autoSync = setInterval(() => {
        if (offline.replicate === undefined) {
          offline.replicate = this.replicateFromCozy(doctype)
            .on('complete', (info) => {
              delete offline.replicate
            })
          // TODO: add replicationToCozy
        }
      }, timer * 1000)
    }
  }

  hasSync (doctype) {
    return this._dbs !== null &&
      doctype in this._dbs &&
      this._dbs[doctype].autoSync !== null
  }

  stopSync (doctype) {
    if (this.hasSync(doctype)) {
      let offline = this._dbs[doctype]
      if (offline.replication) { offline.replication.cancel() }
      clearInterval(offline.autoSync)
      delete offline.autoSync
    }
  }

  replicateFromCozy (doctype, options = {}, events = {}) {
    if (this.hasDatabase(doctype)) {
      if (options.live === true) {
        throw new Error('You can\'t use `live` option with Cozy couchdb.')
      }
      const url = this.cozy._url + '/data/' + doctype
      let db = this.getDatabase(doctype)
      let replication = db.replicate.from(url, options)
      const eventNames = [
        'change', 'paused', 'active', 'denied', 'complete', 'error'
      ]
      for (let eventName of eventNames) {
        if (typeof events[eventName] === 'function') {
          replication.on(eventName, events[eventName])
        }
      }
      return replication
    } else {
      throw new Error(`You should add this doctype: ${doctype} to offline.`)
    }
  }

}

function createIndexes (cozy, db, doctype) {
  if (doctype === DOCTYPE_FILES) {
    db.createIndex({index: {fields: ['dir_id']}})
  }
}
