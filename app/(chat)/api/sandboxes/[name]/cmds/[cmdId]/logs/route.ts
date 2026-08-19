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
  const logParams = await params
  const encoder = new TextEncoder()

  let sandbox
  try {
    sandbox = await Sandbox.get({ name: logParams.name })
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) {
      return new NextResponse(
        JSON.stringify({ error: 'Sandbox not found or has expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    throw error
  }

  let command
  try {
    command = await sandbox.getCommand(logParams.cmdId)
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) {
      return new NextResponse(
        JSON.stringify({ error: 'Command not found or has expired' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }
    throw error
  }

  return new NextResponse(
    new ReadableStream({
      async pull(controller) {
        try {
          for await (const logline of command.logs()) {
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  data: logline.data,
                  stream: logline.stream,
                  timestamp: Date.now(),
                }) + '\n'
              )
            );
          }
        } catch {
          // Sandbox may have been removed during streaming
        }
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  )
}
