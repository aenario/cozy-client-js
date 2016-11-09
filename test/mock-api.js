import fetchMock from 'fetch-mock'

const ROUTES = [
  {
    name: 'Status',
    method: 'GET',
    matcher: '/status',
    response: { 'couchdb': 'ok' }
  },
  {
    name: 'GetDoc',
    method: 'GET',
    matcher: '/data/io.cozy.testobject/42',
    response: {
      '_id': '42',
      '_rev': '1-5444878785445',
      'test': 'value'
    }
  },
  {
    name: 'CreateDoc',
    method: 'POST',
    matcher: '/data/io.cozy.testobject/',
    response: {
      '_id': '42',
      '_rev': '1-5444878785445',
      'data': {
        '_id': '42',
        '_rev': '1-5444878785445',
        'test': 'value'
      }
    }
  },
  {
    name: 'UpdateDoc',
    method: 'PUT',
    matcher: '/data/io.cozy.testobject/42',
    response: {
      '_id': '42',
      '_rev': '2-5444878785445',
      'data': {
        '_id': '42',
        '_rev': '2-5444878785445',
        'test': 'value2'
      }
    }
  },
  {
    name: 'DeleteDoc',
    method: 'DELETE',
    matcher: '/data/io.cozy.testobject/42?rev=1-5444878785445',
    response: {
      'id': '42',
      'rev': '1-5444878785445'
    }
  }
]

fetchMock.mockAPI = (name) => function () {
  ROUTES.filter(route => route.name === name)
        .forEach(route => fetchMock.mock(route))
}

export default fetchMock
