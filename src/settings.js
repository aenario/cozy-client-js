import {cozyFetchJSON} from './fetch'

export class SettingsAPI {
  constructor (cozy) { this.cozy = cozy }

  diskUsage () {
    return cozyFetchJSON(this.cozy, 'GET', `/settings/disk-usage`)
  }
}
