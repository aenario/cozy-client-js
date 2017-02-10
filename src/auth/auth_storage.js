export class LocalStorage {
  constructor (storage, prefix) {
    if (!storage && typeof window !== 'undefined') {
      storage = window.localStorage
    }
    this.storage = storage
    this.prefix = prefix || 'cozy:oauth:'
  }

  save (key, value) {
    return new Promise(resolve => {
      this.storage.setItem(this.prefix + key, JSON.stringify(value))
      resolve(value)
    })
  }

  load (key) {
    return new Promise(resolve => {
      const item = this.storage.getItem(this.prefix + key)
      if (!item) {
        resolve()
      } else {
        resolve(JSON.parse(item))
      }
    })
  }

  delete (key) {
    return new Promise(resolve => resolve(
      this.storage.removeItem(this.prefix + key)))
  }

  clear () {
    return new Promise(resolve => {
      const storage = this.storage
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i)
        if (key.indexOf(this.prefix) === 0) {
          storage.removeItem(key)
        }
      }
      resolve()
    })
  }
}

export class MemoryStorage {
  constructor () {
    this.hash = Object.create(null)
  }

  save (key, value) {
    this.hash[key] = value
    return Promise.resolve(value)
  }

  load (key) {
    return Promise.resolve(this.hash[key])
  }

  delete (key) {
    const deleted = delete this.hash[key]
    return Promise.resolve(deleted)
  }

  clear () {
    this.hash = Object.create(null)
    return Promise.resolve()
  }
}
