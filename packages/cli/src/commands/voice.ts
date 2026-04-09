import { Command } from 'commander'
import { getClient } from '../utils/client.js'
import { type OutputOptions, output, outputError, outputSuccess } from '../utils/output.js'

export function createVoiceCommand(): Command {
  const voice = new Command('voice').description('Voice channel commands')

  voice
    .command('join')
    .description('Join a voice channel as a buddy/agent')
    .argument('<channel-id>', 'Voice channel ID to join')
    .option('--profile <name>', 'Profile to use')
    .option('--server-id <id>', 'Server ID (for policy lookup)')
    .option('--rtc-uid <uid>', 'RTC user ID (numeric)')
    .option('--rtc-token <token>', 'RTC token (optional for dev mode)')
    .option('--rtc-app-id <id>', 'RTC App ID (overrides env)')
    .option('--json', 'Output as JSON')
    .action(
      async (
        channelId: string,
        options: {
          profile?: string
          serverId?: string
          rtcUid?: string
          rtcToken?: string
          rtcAppId?: string
          json?: boolean
        },
      ) => {
        try {
          const client = await getClient(options.profile)
          const outputOpts: OutputOptions = { json: options.json }

          // 1. Verify channel exists and is a voice channel
          const channel = await client.getChannel(channelId)
          if (channel.type !== 'voice') {
            outputError('Channel is not a voice channel', outputOpts)
            process.exit(1)
          }

          // 2. Get buddy policy for this channel (if serverId provided)
          let policy = null
          if (options.serverId) {
            try {
              policy = await client.getBuddyPolicy(channelId)
            } catch {
              // No policy set, use defaults
            }
          }

          // 3. Output connection info for the buddy agent
          const connectionInfo = {
            channelId,
            channelName: channel.name,
            serverId: channel.serverId,
            rtcAppId: options.rtcAppId || process.env.RTC_APP_ID,
            rtcUid: options.rtcUid || '0',
            rtcToken: options.rtcToken || null,
            policy: policy
              ? {
                  mentionOnly: policy.mentionOnly,
                  reply: policy.reply,
                  buddyUserId: policy.buddyUserId,
                }
              : null,
          }

          output(connectionInfo, outputOpts)

          if (!options.json) {
            console.log('\n🎤 Voice Channel Connection Info')
            console.log(`  Channel: ${channel.name} (${channelId})`)
            console.log(`  Server: ${channel.serverId}`)
            console.log(`  RTC App ID: ${connectionInfo.rtcAppId || '(not set)'}`)
            console.log(`  RTC UID: ${connectionInfo.rtcUid}`)
            if (connectionInfo.rtcToken) {
              console.log(`  RTC Token: ${connectionInfo.rtcToken.substring(0, 20)}...`)
            }
            if (policy) {
              console.log(
                `  Buddy Policy: mention_only=${policy.mentionOnly}, reply=${policy.reply}`,
              )
            }
            console.log('\n💡 Use this info to connect your buddy agent to the voice channel.')
          }
        } catch (error) {
          outputError(error instanceof Error ? error.message : String(error), {
            json: options.json,
          })
          process.exit(1)
        }
      },
    )

  voice
    .command('leave')
    .description('Leave a voice channel')
    .argument('<channel-id>', 'Voice channel ID to leave')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output as JSON')
    .action(async (channelId: string, options: { profile?: string; json?: boolean }) => {
      try {
        const client = await getClient(options.profile)
        const outputOpts: OutputOptions = { json: options.json }

        // Get channel info to verify
        const channel = await client.getChannel(channelId)
        if (channel.type !== 'voice') {
          outputError('Channel is not a voice channel', outputOpts)
          process.exit(1)
        }

        outputSuccess(`Ready to leave voice channel: ${channel.name}`, outputOpts)
      } catch (error) {
        outputError(error instanceof Error ? error.message : String(error), {
          json: options.json,
        })
        process.exit(1)
      }
    })

  voice
    .command('status')
    .description('Get voice channel status')
    .argument('<channel-id>', 'Voice channel ID')
    .option('--profile <name>', 'Profile to use')
    .option('--json', 'Output as JSON')
    .action(async (channelId: string, options: { profile?: string; json?: boolean }) => {
      try {
        const client = await getClient(options.profile)
        const outputOpts: OutputOptions = { json: options.json }

        const channel = await client.getChannel(channelId)
        if (channel.type !== 'voice') {
          outputError('Channel is not a voice channel', outputOpts)
          process.exit(1)
        }

        const policy = await client.getBuddyPolicy(channelId).catch(() => null)

        output(
          {
            channelId,
            name: channel.name,
            serverId: channel.serverId,
            buddyPolicy: policy,
          },
          outputOpts,
        )
      } catch (error) {
        outputError(error instanceof Error ? error.message : String(error), {
          json: options.json,
        })
        process.exit(1)
      }
    })

  return voice
}
