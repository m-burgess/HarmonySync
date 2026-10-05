import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nashvilleToStandard, getCapoFret, suggestCapoKey } from './transposer.js'

test('nashvilleToStandard transposes scale degrees', () => {
  assert.equal(nashvilleToStandard('1', 'C'), 'C')
  assert.equal(nashvilleToStandard('6m', 'C'), 'Am')
  assert.equal(nashvilleToStandard('5', 'D'), 'A')
  assert.equal(nashvilleToStandard('4maj7', 'G'), 'Cmaj7')
})

test('nashvilleToStandard transposes slash-chord bass degrees', () => {
  assert.equal(nashvilleToStandard('1/3', 'C'), 'C/E')
  assert.equal(nashvilleToStandard('4/5', 'G'), 'C/D')
  assert.equal(nashvilleToStandard('6m7/5', 'D'), 'Bm7/A')
})

test('nashvilleToStandard leaves non-Nashville input alone', () => {
  assert.equal(nashvilleToStandard('N.C.', 'C'), 'N.C.')
  assert.equal(nashvilleToStandard('1', 'H'), '1')
})

test('capo helpers', () => {
  assert.equal(suggestCapoKey('E'), 'C')
  assert.equal(suggestCapoKey('A'), 'G')
  assert.equal(getCapoFret('E', 'C'), 4)
  assert.equal(getCapoFret('A', 'G'), 2)
})
