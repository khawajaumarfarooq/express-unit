import { describe, it } from 'global'
import wrap from 'express-async-wrap'
import { expect, spy, AssertionError } from './__setup__'
import { run, Request, Response, ExpressUnitError } from '../src/express-unit'

describe('express-unit', () => {

  it('runs a middleware', () => {
    const middleware = spy(function middleware() {})
    run(null, middleware)
    expect(middleware).to.have.been.called
  })

  it('calls a setup function with a req, res, and next', done => {
    const setup = (req, res, next) => {
      expect(req).to.be.an.instanceOf(Request)
      expect(req.app).to.be.an('object')
      expect(req.body).to.be.an('object')
      expect(req.cookies).to.be.an('object')
      expect(req.params).to.be.an('object')
      expect(req.query).to.be.an('object')
      expect(req.route).to.be.an('object')
      expect(req.signedCookies).to.be.an('object')
      expect(res).to.be.an.instanceOf(Response)
      expect(res.app).to.be.an('object')
      expect(res.locals).to.be.an('object')
      expect(next).to.be.a('function')
      done()
    }
    run(setup)
  })

  it('runs a setup function before running a middleware', () => {
    const setup = spy((req, res, next) => next())
    const middleware = spy(_ => _)
    run(setup, middleware)
    expect(setup).to.have.been.calledBefore(middleware)
  })

  it('calls a callback after running a middleware', done => {
    const middleware = (req, res, next) => next()
    run(null, middleware, done)
  })

  it('forwards errors from middleware to callback', done => {
    const middleware = (req, res, next) => next(new Error('oops'))
    run(null, middleware, err => {
      expect(err).to.have.property('message', 'oops')
      done()
    })
  })

  it('calls a callback after a response method is called', done => {
    const middleware = (req, res) => res.end()
    run(null, middleware, done)
  })

  it('supports error handling middleware', done => {
    const setup = (req, res, next) => next(new Error('oops'))
    // eslint-disable-next-line no-unused-vars
    const middleware = (err, req, res, next) => {
      expect(err).to.have.property('message', 'oops')
      done()
    }
    run(setup, middleware)
  })

  it('supports chainable response methods', done => {
    const middleware = (req, res) => res.status(201).end()
    run(null, middleware, err => {
      expect(err).not.to.exist
      done()
    })
  })

  it('supports asynchronous middleware', done => {
    const middleware = (req, res, next) => setTimeout(() => next())
    run(null, middleware, done)
  })

  it('supports async/await middleware', async () => {
    const middleware = wrap(async (req, res, next) => await next())
    return run(null, middleware, (err, req, res) => {
      expect(err).to.be.null
      expect(req).to.be.an.instanceOf(Request)
      expect(res).to.be.an.instanceOf(Response)
    })
  })

  it('supports spread on async/await middleware', () => {
    const middleware = wrap(async (req, res, next) => await next())
    return run(null, middleware)
      .spread((err, req, res) => {
        expect(err).to.be.null
        expect(req).to.be.an.instanceOf(Request)
        expect(res).to.be.an.instanceOf(Response)
      })
  })

  it('rejects async/await middlware that does not handle errors', async () => {
    const middleware = () => Promise.reject(new Error('oops'))
    const err = await run(null, middleware).catch(err => err)
    expect(err).to.be.an.instanceOf(ExpressUnitError)
    expect(err.toString()).to.include('Unhandled rejection')
  })

  it('forwards assertion errors in callback to async/await middleware', () => {
    const middleware = () => Promise.resolve()
    return run(null, middleware, err => expect(err).to.exist)
      .catch(err => {
        expect(err).to.be.an.instanceOf(AssertionError)
      })
  })

  it('resolves an array of results', async () => {
    const middleware = wrap(async (req, res, next) => next())
    const [ err, req, res ] = await run(null, middleware)
    expect(err).to.be.null
    expect(req).to.be.an.instanceOf(Request)
    expect(res).to.be.an.instanceOf(Response)
  })

})
