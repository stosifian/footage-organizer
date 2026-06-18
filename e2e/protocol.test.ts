/**
 * E2E tests for the footage:// custom protocol handler.
 *
 * These run inside a real Electron process and cover the exact gap that jsdom
 * unit tests cannot: whether the protocol handler actually serves binary data,
 * sets correct headers, and handles range requests for video seeking.
 *
 * History: the following bugs were only caught by manual testing —
 * these tests would have surfaced them immediately:
 *   - net.fetch body-lock: Response(response.body) silently returned empty body
 *   - hostname stripping: footage:///Users/… parsed 'Users' as hostname, dropped it from path
 *   - missing Content-Type: file:// responses return no type, Chromium couldn't pick a decoder
 */
import { test, expect } from './fixtures/electron-app'
import fs from 'fs'
import path from 'path'
import os from 'os'

const TMP = os.tmpdir()

// Write small test files once per suite
let mp4File: string
let movFile: string
let rangeFile: string

test.beforeAll(() => {
  mp4File = path.join(TMP, 'footage-e2e-test.mp4')
  movFile = path.join(TMP, 'footage-e2e-test.mov')
  rangeFile = path.join(TMP, 'footage-e2e-range.mp4')

  fs.writeFileSync(mp4File, Buffer.alloc(512, 0xab))
  fs.writeFileSync(movFile, Buffer.alloc(512, 0xcd))
  // 1 000 bytes of known data for range assertions
  fs.writeFileSync(rangeFile, Buffer.alloc(1000, 0x42))
})

test.afterAll(() => {
  for (const f of [mp4File, movFile, rangeFile]) {
    try { fs.unlinkSync(f) } catch { /* ignore */ }
  }
})

test('serves an existing file with status 200', async ({ window }) => {
  const status = await window.evaluate(async (p) => {
    const r = await fetch(`footage://localhost${p}`)
    return r.status
  }, mp4File)
  expect(status).toBe(200)
})

test('returns Content-Type video/mp4 for .mp4 files', async ({ window }) => {
  const ct = await window.evaluate(async (p) => {
    const r = await fetch(`footage://localhost${p}`)
    return r.headers.get('content-type')
  }, mp4File)
  expect(ct).toBe('video/mp4')
})

test('returns Content-Type video/quicktime for .mov files', async ({ window }) => {
  const ct = await window.evaluate(async (p) => {
    const r = await fetch(`footage://localhost${p}`)
    return r.headers.get('content-type')
  }, movFile)
  expect(ct).toBe('video/quicktime')
})

test('advertises Accept-Ranges: bytes', async ({ window }) => {
  const ar = await window.evaluate(async (p) => {
    const r = await fetch(`footage://localhost${p}`)
    return r.headers.get('accept-ranges')
  }, mp4File)
  expect(ar).toBe('bytes')
})

test('serves correct byte count matching file size', async ({ window }) => {
  const { cl, bodyLen } = await window.evaluate(async (p) => {
    const r = await fetch(`footage://localhost${p}`)
    const buf = await r.arrayBuffer()
    return { cl: r.headers.get('content-length'), bodyLen: buf.byteLength }
  }, rangeFile)
  expect(parseInt(cl!)).toBe(1000)
  expect(bodyLen).toBe(1000)
})

test('handles a range request with 206 Partial Content', async ({ window }) => {
  const result = await window.evaluate(async (p) => {
    const r = await fetch(`footage://localhost${p}`, {
      headers: { Range: 'bytes=0-99' }
    })
    const buf = await r.arrayBuffer()
    return {
      status: r.status,
      contentRange: r.headers.get('content-range'),
      contentLength: r.headers.get('content-length'),
      bodyLen: buf.byteLength
    }
  }, rangeFile)
  expect(result.status).toBe(206)
  expect(result.contentRange).toBe('bytes 0-99/1000')
  expect(result.contentLength).toBe('100')
  expect(result.bodyLen).toBe(100)
})

test('returns 404 for a non-existent file', async ({ window }) => {
  const status = await window.evaluate(async () => {
    const r = await fetch('footage://localhost/tmp/does-not-exist-xyz.mp4')
    return r.status
  })
  expect(status).toBe(404)
})

test('correctly serves a path with spaces (regression: hostname-stripping bug)', async ({ window }) => {
  const spaceFile = path.join(TMP, 'footage test file.mp4')
  fs.writeFileSync(spaceFile, Buffer.alloc(100, 0xff))
  try {
    const status = await window.evaluate(async (p) => {
      const encoded = p.replace(/ /g, '%20')
      const r = await fetch(`footage://localhost${encoded}`)
      return r.status
    }, spaceFile)
    expect(status).toBe(200)
  } finally {
    fs.unlinkSync(spaceFile)
  }
})
