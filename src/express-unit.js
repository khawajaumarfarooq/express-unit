import Error from 'es6-error'
import { request, response } from 'express'

const Request = () => ({
  __proto__: request,
  app: {},
  body: {},
  query: {},
  route: {},
  params: {},
  headers: {},
  cookies: {},
  signedCookies: {}
})

const Response = () => ({
  __proto__: response,
  app: {},
  locals: {}
})

const chainables = ['status', 'vary']

export function run(setup, middleware, done) {

  setup = setup || ((req, res, next) => next())

  const req = Request()
  const res = Response()

  let err = null
  let isDone = false

  const finish = (_err = null) => {
    err = _err
    isDone = true
    isFunction(done) && done(err, req, res)
  }

  for (let property in res) {
    if (isFunction(res[property])) {
      res[property] = () => chainables.includes(property) ? res : finish()
    }
  }

  let middlewareNexted = false
  const middlewareFinish = (_err = null) => {
    if(middlewareNexted)
      throw new ExpressUnitError('Called middleware more then once')
    middlewareNexted = true
    finish(_err)
  }

  let promise

  setup(req, res, (_err = null) => {
    err = _err
    promise = middleware.length <= 3
      ? middleware(req, res, middlewareFinish)
      : middleware(err, req, res, middlewareFinish)
  })

  if (!isPromise(promise)) return

  return promise
    .then(() => {
      if (isDone || !isFunction(done)) return [err, req, res]
      try {
        done(err, req, res)
      }
      catch(err) {
        throw new ExpressUnitError(null, err)
      }
    })
    .catch(err => {
      if (err instanceof ExpressUnitError) throw err.err
      throw new ExpressUnitError('Unhandled rejection in middleware', err)
    })
}

export class ExpressUnitError extends Error {
  constructor(message, err) {
    super(message)
    this.err = err
  }
  toString() {
    const { name, message, err } = this
    return `${name}: ${message}\n${JSON.stringify(err, null, 2)}`
  }
}

function isFunction(value) {
  return typeof value === 'function'
}

function isPromise(value) {
  return value && typeof value === 'object' && isFunction(value.then)
}
