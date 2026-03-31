/**
 * CLI: shadowob-cloud images — build, push, and list Docker images.
 */

import { Command } from 'commander'
import type { ServiceContainer } from '../../services/container.js'
import { IMAGES, type ImageName } from '../../services/image.service.js'

export function createImagesCommand(container: ServiceContainer) {
  const cmd = new Command('images').description('Manage Docker images')

  cmd.addCommand(
    new Command('list').description('List available image definitions').action(() => {
      const images = container.image.list()
      container.logger.info('Available images:')
      for (const img of images) {
        container.logger.dim(
          `  ${img.name}: ${img.hasDockerfile ? '✓ Dockerfile found' : '✗ No Dockerfile'}`,
        )
      }
      container.logger.dim('')
      container.logger.dim(`  Images dir: ${container.image.getImagesDir()}`)
      container.logger.dim(`  Registry  : ${container.image.getRegistry()}`)
    }),
  )

  cmd.addCommand(
    new Command('build')
      .description('Build a Docker image')
      .argument('<name>', `Image name (${IMAGES.join(' | ')}) or "all"`)
      .option('-t, --tag <tag>', 'Image tag', 'latest')
      .option('--no-cache', 'Build without cache')
      .option('--into-k8s', 'Build for local K8s', false)
      .option('--push', 'Push to registry after build', false)
      .option('--platform <platform>', 'Target platform (e.g. linux/amd64,linux/arm64)')
      .action(
        async (
          name: string,
          options: {
            tag: string
            cache: boolean
            intoK8s: boolean
            push: boolean
            platform?: string
          },
        ) => {
          const imagesToBuild = name === 'all' ? [...IMAGES] : [name]

          for (const imgName of imagesToBuild) {
            if (!IMAGES.includes(imgName as ImageName)) {
              container.logger.error(
                `Unknown image: ${imgName}. Available: ${IMAGES.join(', ')} or "all"`,
              )
              process.exit(1)
            }
          }

          try {
            for (const imgName of imagesToBuild) {
              await container.image.build({
                name: imgName,
                tag: options.tag,
                noCache: !options.cache,
                intoK8s: options.intoK8s,
                push: options.push,
                platform: options.platform,
              })
            }
          } catch (err) {
            container.logger.error((err as Error).message)
            process.exit(1)
          }
        },
      ),
  )

  cmd.addCommand(
    new Command('push')
      .description('Push image to registry')
      .argument('<name>', `Image name (${IMAGES.join(', ')})`)
      .option('-t, --tag <tag>', 'Image tag', 'latest')
      .action(async (name: string, options: { tag: string }) => {
        if (!IMAGES.includes(name as ImageName)) {
          container.logger.error(`Unknown image: ${name}. Available: ${IMAGES.join(', ')}`)
          process.exit(1)
        }
        try {
          await container.image.push(name, options.tag)
        } catch (err) {
          container.logger.error((err as Error).message)
          process.exit(1)
        }
      }),
  )

  return cmd
}
