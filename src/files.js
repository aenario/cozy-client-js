/* global Blob, File */
import {cozyFetch, cozyFetchJSON} from './fetch'
import jsonapi from './jsonapi'
import { DOCTYPE_FILES } from './doctypes'

const contentTypeOctetStream = 'application/octet-stream'

export class FilesAPI {

  constructor (cozy) {
    this.cozy = cozy
  }

  create (data, options) {
    let {name, dirID} = options || {}

    // handle case where data is a file and contains the name
    if (!name && typeof data.name === 'string') {
      name = data.name
    }

    if (typeof name !== 'string' || name === '') {
      throw new Error('missing name argument')
    }

    const path = `/files/${encodeURIComponent(dirID || '')}`
    const query = `?Name=${encodeURIComponent(name)}&Type=file`
    return doUpload(this.cozy, data, 'POST', `${path}${query}`, options)
  }

  createDirectory (options) {
    const {name, dirID} = options || {}

    if (typeof name !== 'string' || name === '') {
      throw new Error('missing name argument')
    }

    const path = `/files/${encodeURIComponent(dirID || '')}`
    const query = `?Name=${encodeURIComponent(name)}&Type=directory`
    return cozyFetchJSON(this.cozy, 'POST', `${path}${query}`)
  }

  updateById (id, data, options) {
    return doUpload(this.cozy, data, 'PUT', `/files/${encodeURIComponent(id)}`, options)
  }

  updateAttributesById (id, attrs) {
    if (!attrs || typeof attrs !== 'object') {
      throw new Error('missing attrs argument')
    }

    const body = { data: { attributes: attrs } }
    return cozyFetchJSON(this.cozy, 'PATCH',
      `/files/${encodeURIComponent(id)}`, body)
  }

  updateAttributesByPath (path, attrs) {
    if (!attrs || typeof attrs !== 'object') {
      throw new Error('missing attrs argument')
    }

    const body = { data: { attributes: attrs } }
    return cozyFetchJSON(this.cozy, 'PATCH',
      `/files/metadata?Path=${encodeURIComponent(path)}`, body)
  }

  trashById (id) {
    if (typeof id !== 'string' || id === '') {
      throw new Error('missing id argument')
    }
    return cozyFetchJSON(this.cozy, 'DELETE', `/files/${encodeURIComponent(id)}`)
  }

  statById (id, offline = true) {
    if (offline && this.cozy.offline.hasDatabase(DOCTYPE_FILES)) {
      let db = this.cozy.offline.getDatabase(DOCTYPE_FILES)
      return Promise.all([
        db.get(id),
        db.find({selector: {'dir_id': id}})
      ]).then(([doc, children]) => {
        children = children.docs.map(doc => {
          return addIsDir(toJsonApi(this.cozy, doc))
        })
        return addIsDir(toJsonApi(this.cozy, doc, children))
      })
    }
    return cozyFetchJSON(this.cozy, 'GET', `/files/${encodeURIComponent(id)}`)
      .then(addIsDir)
  }

  statByPath (path) {
    return cozyFetchJSON(this.cozy, 'GET', `/files/metadata?Path=${encodeURIComponent(path)}`)
      .then(addIsDir)
  }

  downloadById (id) {
    return cozyFetch(this.cozy, `/files/download/${encodeURIComponent(id)}`)
  }

  downloadByPath (path) {
    return cozyFetch(this.cozy, `/files/download?Path=${encodeURIComponent(path)}`)
  }

  getDowloadLink (path) {
    return cozyFetchJSON(this.cozy, 'POST', `/files/downloads?Path=${encodeURIComponent(path)}`)
      .then(extractResponseLinkRelated)
  }

  getArchiveLink (paths, name = 'files') {
    const archive = {
      type: 'io.cozy.archives',
      attributes: {
        name: name,
        files: paths
      }
    }
    return cozyFetchJSON(this.cozy, 'POST', `/files/archive`, {data: archive})
    .then(extractResponseLinkRelated)
  }

  listTrash () {
    return cozyFetchJSON(this.cozy, 'GET', `/files/trash`)
  }

  clearTrash () {
    return cozyFetchJSON(this.cozy, 'DELETE', `/files/trash`)
  }

  restoreById (id) {
    return cozyFetchJSON(this.cozy, 'POST', `/files/trash/${encodeURIComponent(id)}`)
  }

  destroyById (id) {
    return cozyFetchJSON(this.cozy, 'DELETE', `/files/trash/${encodeURIComponent(id)}`)
  }
}

function addIsDir (obj) {
  obj.isDir = obj.attributes.type === 'directory'
  return obj
}

function toJsonApi (cozy, doc, contents = []) {
  let clone = JSON.parse(JSON.stringify(doc))
  delete clone._id
  delete clone._rev
  return {
    _id: doc._id,
    _rev: doc._rev,
    _type: DOCTYPE_FILES,
    attributes: clone,
    relations: (name) => {
      if (name === 'contents') {
        return contents
      }
    }
  }
}

function extractResponseLinkRelated (res) {
  let href = res.links && res.links.related
  if (!href) throw new Error('No related link in server response')
  return href
}

function doUpload (cozy, data, method, path, options) {
  if (!data) {
    throw new Error('missing data argument')
  }

  // transform any ArrayBufferView to ArrayBuffer
  if (data.buffer && data.buffer instanceof ArrayBuffer) {
    data = data.buffer
  }

  const isBuffer = (typeof ArrayBuffer !== 'undefined' && data instanceof ArrayBuffer)
  const isFile = (typeof File !== 'undefined' && data instanceof File)
  const isBlob = (typeof Blob !== 'undefined' && data instanceof Blob)
  const isString = (typeof data === 'string')

  if (!isBuffer && !isFile && !isBlob && !isString) {
    throw new Error('invalid data type')
  }

  let {contentType, lastModifiedDate} = options || {}
  if (!contentType) {
    if (isBuffer) {
      contentType = contentTypeOctetStream
    } else if (isFile) {
      contentType = data.type || contentTypeOctetStream
      if (!lastModifiedDate) {
        lastModifiedDate = data.lastModifiedDate
      }
    } else if (isBlob) {
      contentType = contentTypeOctetStream
    } else if (typeof data === 'string') {
      contentType = 'text/plain'
    }
  }

  if (lastModifiedDate && typeof lastModifiedDate === 'string') {
    lastModifiedDate = new Date(lastModifiedDate)
  }

  return cozyFetch(cozy, path, {
    method: method,
    headers: {
      'Content-Type': contentType,
      'Date': lastModifiedDate ? lastModifiedDate.toISOString() : ''
    },
    body: data
  })
    .then((res) => {
      const json = res.json()
      if (!res.ok) {
        return json.then(err => { throw err })
      } else {
        return json.then(jsonapi)
      }
    })
}
