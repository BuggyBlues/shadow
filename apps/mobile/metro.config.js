const { getDefaultConfig } = require('expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const monorepoRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// Watch the monorepo root for changes in shared packages
config.watchFolders = [monorepoRoot]

// Resolve modules from both the project and monorepo root node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
]

// Force singleton packages to resolve from mobile's node_modules
// to prevent duplicate React (web uses 19.2.4, mobile needs 19.1.0)
const projectModules = path.resolve(projectRoot, 'node_modules')
const singletonPackages = ['react', 'react-native', 'react/jsx-runtime', 'react/jsx-dev-runtime']
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (singletonPackages.some((pkg) => moduleName === pkg || moduleName.startsWith(`${pkg}/`))) {
    return context.resolveRequest(
      { ...context, originModulePath: path.join(projectModules, '_virtual.js') },
      moduleName,
      platform,
    )
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = config
