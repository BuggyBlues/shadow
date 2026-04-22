import { delimiter } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { ensurePulumiCliOnPath } from '../../src/clients/pulumi-client'

const originalPath = process.env.PATH

describe('ensurePulumiCliOnPath', () => {
  afterEach(() => {
    process.env.PATH = originalPath
  })

  it('prepends the Pulumi bin directory to PATH', () => {
    process.env.PATH = ['/usr/bin', '/bin'].join(delimiter)

    const binDir = ensurePulumiCliOnPath('/root/.shadowob/pulumi/cli')

    expect(process.env.PATH?.split(delimiter)[0]).toBe(binDir)
    expect(binDir).toBe('/root/.shadowob/pulumi/cli/bin')
  })

  it('does not duplicate the Pulumi bin directory', () => {
    const binDir = '/root/.shadowob/pulumi/cli/bin'
    process.env.PATH = [binDir, '/usr/bin', '/bin'].join(delimiter)

    ensurePulumiCliOnPath('/root/.shadowob/pulumi/cli')

    expect(process.env.PATH).toBe([binDir, '/usr/bin', '/bin'].join(delimiter))
  })
})
