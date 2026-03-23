#!/usr/bin/env node
import { Command } from 'commander'
import { createAuthCommand } from './commands/auth.js'
import { createServersCommand } from './commands/servers.js'
import { createChannelsCommand } from './commands/channels.js'
import { createThreadsCommand } from './commands/threads.js'
import { createAgentsCommand } from './commands/agents.js'
import { createListenCommand } from './commands/listen.js'
import { configManager } from './config/manager.js'

const program = new Command()

program
  .name('shadowob')
  .description('Shadow CLI — command-line interface for Shadow servers')
  .version('0.1.0')
  .configureHelp({
    sortSubcommands: true,
  })

// Global options
program.option('--profile <name>', 'Profile to use (default: current)')

// Commands
program.addCommand(createAuthCommand())
program.addCommand(createServersCommand())
program.addCommand(createChannelsCommand())
program.addCommand(createThreadsCommand())
program.addCommand(createAgentsCommand())
program.addCommand(createListenCommand())

// Config command
program
  .command('config')
  .description('Show configuration file path')
  .action(() => {
    console.log(configManager.getConfigPath())
  })

program.parse()
