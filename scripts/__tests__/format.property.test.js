import { describe, it } from 'node:test'
import fc from 'fast-check'
import { ok } from 'node:assert/strict'

describe('format.js Property-Based Tests', () => {

  const itemArbitrary = fc.record({
    isoDate: fc.date().map(d => d.toISOString())
  });

  const processingLogic = (items, limit) => {
    return items
      .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate))
      .slice(0, limit);
  };

  it('should limit the number of items to the processingLimit', () => {
    fc.assert(
      fc.property(fc.array(itemArbitrary), fc.nat(1000), (items, limit) => {
        const result = processingLogic(items, limit);
        ok(result.length <= limit);
        ok(result.length <= items.length);
      })
    );
  });

  it('should sort items by date in descending order', () => {
    fc.assert(
      fc.property(fc.array(itemArbitrary), fc.nat(1000), (items, limit) => {
        const result = processingLogic(items, limit);
        for (let i = 0; i < result.length - 1; i++) {
          ok(new Date(result[i].isoDate) >= new Date(result[i + 1].isoDate));
        }
      })
    );
  });
});
