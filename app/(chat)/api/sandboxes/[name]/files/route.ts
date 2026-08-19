import { NextResponse, type NextRequest } from 'next/server'
import { Sandbox, APIError } from '@vercel/sandbox'
import z from 'zod'

const FileParamsSchema = z.object({
  name: z.string(),
  path: z.string(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  const pathParam = request.nextUrl.searchParams.get('path')

  const parsed = FileParamsSchema.safeParse({ name, path: pathParam })
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid parameters. You must pass a `path` as query' },
      { status: 400 }
    )
  }

  const { name: sandboxName, path: filePath } = parsed.data

  let sandbox
  try {
    sandbox = await Sandbox.get({ name: sandboxName })
  } catch (error) {
    if (error instanceof APIError && error.response.status === 404) {
      return NextResponse.json(
        { error: 'Sandbox not found or has expired' },
        { status: 404 }
      )
    }
    throw error
  }

  const stream = await sandbox.readFile({ path: filePath })
  if (!stream) {
    return NextResponse.json(
      { error: 'File not found in the Sandbox' },
      { status: 404 }
    )
  }

  return new NextResponse(
    new ReadableStream({
      async pull(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(chunk)
          }
        } catch {
          // Sandbox may have been removed during streaming
        }
        controller.close()
      },
    })
  )
}
