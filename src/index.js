import Cozy from './cozy'
import {LocalStorage, MemoryStorage} from './auth/auth_storage'

const cozy = new Cozy()

export default cozy
export { Cozy, LocalStorage, MemoryStorage }

if ((typeof window) !== 'undefined') {
  window.cozy = cozy
  window.Cozy = Cozy
}
