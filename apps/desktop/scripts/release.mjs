import { execSync } from 'node:child_process'

const args = process.argv.slice(2)

const arg = (name, fallback) => {
  const key = `--${name}=`
  const found = args.find((a) => a.startsWith(key))
  return found ? found.slice(key.length) : fallback
}

const hasFlag = (name) => args.includes(`--${name}`)

const platform = arg('platform', process.platform)
const arch = arg('arch', process.arch)
const mode = arg('mode', 'make') // make|package
const notarize = hasFlag('notarize')

function runForTarget(targetPlatform, targetArch) {
  const cmd = `${base} --platform=${targetPlatform} --arch=${targetArch}`
  console.log(`\n[release] ${cmd}`)
  execSync(cmd, { stdio: 'inherit', env: process.env })
}

function validateNotarizationEnv() {
  const hasApiKey =
    !!process.env.APPLE_API_KEY && !!process.env.APPLE_API_KEY_ID && !!process.env.APPLE_API_ISSUER

  if (!hasApiKey) {
    throw new Error(
      '[release] notarization requires API key trio (APPLE_API_KEY, APPLE_API_KEY_ID, APPLE_API_ISSUER)',
    )
  }
}

if (notarize && platform === 'darwin') {
  validateNotarizationEnv()
}

const makeOrPackage = mode === 'package' ? 'package' : 'make'
const base = `pnpm run ${makeOrPackage} --`

if (platform === 'all') {
  const targets = [
    ['darwin', 'x64'],
    ['darwin', 'arm64'],
    ['win32', 'x64'],
    ['linux', 'x64'],
  ]
  for (const [p, a] of targets) {
    runForTarget(p, a)
  }
} else {
  runForTarget(platform, arch)
}

console.log('\n[release] done')
