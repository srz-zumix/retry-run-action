/**
 * The entrypoint for the post action.
 */

import * as core from '@actions/core'
import { promises as fs } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'
import * as io from '@actions/io'
import * as exec from '@actions/exec'

async function resolveShell(): Promise<string[]> {
  const defaultCommands: { [key: string]: string[] } = {
    default: ['bash', '-e', '{0}'],
    sh: ['sh', '-e', '{0}'],
    bash: ['bash', '--noprofile', '--norc', '-eo', 'pipefail', '{0}'],
    cmd: ['cmd', '/D', '/E:ON', '/V:OFF', '/S', '/C', '"CALL "{0}""'],
    pwsh: ['pwsh', '-command', ". '{0}'"],
    powershell: ['powershell', '-command', ". '{0}'"]
  }
  const shellCommand = core.getInput('shell', { required: false })
  if (!shellCommand) {
    return defaultCommands['default']
  }

  const shellCommands = shellCommand.split(' ')
  if (shellCommands.length === 1) {
    if (shellCommands[0] in defaultCommands) {
      return defaultCommands[shellCommands[0]]
    } else {
      return [shellCommands[0], '{0}']
    }
  }
  return shellCommands
}

function resolveExtension(command: string): string {
  const commandExtensions: { [key: string]: string } = {
    python: 'py',
    cmd: 'cmd',
    pwsh: 'ps1',
    powershell: 'ps1'
  }
  if (command in commandExtensions) {
    return commandExtensions[command]
  }
  return 'sh'
}

async function runOnce(
  commandPath: string,
  commandArgs: string[],
  options: exec.ExecOptions,
  attempt: number
): Promise<void> {
  options.env = {
    ...process.env,
    RETRY_RUN_ATTEMPT: attempt.toString()
  }
  await exec.exec(`"${commandPath}"`, commandArgs, options)
}

async function run(): Promise<void> {
  try {
    const retry: number = parseInt(core.getInput('retry'), 10)
    const interval: number = parseInt(core.getInput('interval'), 10)
    const content: string = core.getInput('run', { required: true })
    const shellCommands: string[] = await resolveShell()
    const command = shellCommands[0]
    const commandPath: string = await io.which(command, true)

    const runnerTempPath: string = process.env.RUNNER_TEMP as string
    const extension: string = resolveExtension(command)
    const uniqueId = uuidv4()
    const scriptFileName = `retry-run-action-${uniqueId}.${extension}`
    const scriptPath = path.join(runnerTempPath, scriptFileName)
    await fs.writeFile(scriptPath, content)

    const commandArgs = shellCommands
      .slice(1)
      .map(item => item.replace('{0}', scriptPath))

    const options: exec.ExecOptions = {}
    options.windowsVerbatimArguments = command === 'cmd'

    let attempt = 1
    for (let i = 1; i < retry; i++, attempt++) {
      try {
        options.env = {
          ...process.env,
          RETRY_RUN_ATTEMPT: attempt.toString()
        }
        await runOnce(commandPath, commandArgs, options, attempt)
        return
      } catch (error) {
        // Fail the workflow run if an error occurs
        if (error instanceof Error) core.warning(error.message)
        if (interval > 0) {
          await new Promise(resolve => setTimeout(resolve, interval * 1000))
        }
      }
    }
    await runOnce(commandPath, commandArgs, options, attempt)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}

void run()
