import { describe, it, mock } from 'node:test'
import fc from 'fast-check'
import { strictEqual } from 'node:assert/strict'
import ErrorHandler from '../ErrorHandler.js'

describe('ErrorHandler Property-Based Tests', () => {

  it('withErrorHandling should not throw when the wrapped function throws', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (errorMessage, context) => {
        const handler = new ErrorHandler()
        const failingFunction = () => { throw new Error(errorMessage) }
        
        // This should not throw
        handler.withErrorHandling(failingFunction, context)
      })
    )
  })

  it('withErrorHandling should call logError when the wrapped function throws', () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (errorMessage, context) => {
        const handler = new ErrorHandler()
        const logErrorMock = mock.method(handler, 'logError');
        const failingFunction = () => { throw new Error(errorMessage) }

        handler.withErrorHandling(failingFunction, context)

        strictEqual(logErrorMock.mock.calls.length, 1)
        strictEqual(logErrorMock.mock.calls[0].arguments[0].message, errorMessage)
        strictEqual(logErrorMock.mock.calls[0].arguments[1], context)
      })
    )
  })

  it('withErrorHandling should return the result of the function when it does not throw', () => {
    fc.assert(
      fc.property(fc.anything(), fc.string(), (returnValue, context) => {
        const handler = new ErrorHandler()
        const successfulFunction = () => returnValue
        
        const result = handler.withErrorHandling(successfulFunction, context)
        strictEqual(result, returnValue)
      })
    )
  })
});
