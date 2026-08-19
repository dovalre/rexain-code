import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox, APIError } from '@vercel/sandbox'

interface Params {
  name: string
  cmdId: string
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<Params> }
) {
  const cmdParams = await params

  let sandbox
  try {
    sandbox = await Sandbox.get({ name: cmdParams.name })
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) {
      return NextResponse.json(
        { error: 'Sandbox not found or has expired' },
        { status: 404 }
      )
    }
    throw error
  }

  let command
  try {
    command = await sandbox.getCommand(cmdParams.cmdId)
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) {
      return NextResponse.json(
        { error: 'Command not found or has expired' },
        { status: 404 }
      )
    }
    throw error
  }

  /**
   * The wait can get to fail when the Sandbox is stopped but the command
   * was still running. In such case we return empty for finish data.
   */
  const done = await command.wait().catch(() => null)
  return NextResponse.json({
    sandboxName: sandbox.name,
    cmdId: command.cmdId,
    startedAt: command.startedAt,
    exitCode: done?.exitCode,
  })
}
