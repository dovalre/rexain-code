import { APIError, Sandbox } from '@vercel/sandbox'
import { NextRequest, NextResponse } from 'next/server'

/**
 * We must change the SDK to add data to the instance and then
 * use it to retrieve the status of the Sandbox.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params
  try {
    const sandbox = await Sandbox.get({ name })

    // Sandbox ditemukan — coba jalankan dev server (jika belum jalan, abaikan error)
    try {
      await sandbox.runCommand({
        cmd: 'npm',
        args: ['run', 'dev'],
        detached: true,
      })
    } catch {
      // npm run dev mungkin sudah jalan, abaikan
    }

    return NextResponse.json({ status: 'running', sandboxName: name })
  } catch (error) {
    if (
      error instanceof APIError &&
      error.json?.error?.code === 'sandbox_stopped'
    ) {
      // Sandbox ditemukan tapi dalam keadaan stopped — coba restart
      try {
        const sandbox = await Sandbox.get({ name })
        await sandbox.runCommand({
          cmd: 'npm',
          args: ['run', 'dev'],
          detached: true,
        })
        return NextResponse.json({ status: 'running', sandboxName: name })
      } catch {
        // Restart gagal — sandbox sudah expired total
        return NextResponse.json({ status: 'expired', sandboxName: name })
      }
    } else {
      console.error('Sandbox GET error:', error)
      return NextResponse.json(
        { status: 'error', error: error instanceof Error ? error.message : 'Unknown error', sandboxName: name },
        { status: 500 }
      )
    }
  }
}
