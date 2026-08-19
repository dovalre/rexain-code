import { put } from "@vercel/blob"
import { NextResponse } from "next/server"
import { getSession } from '@/lib/db/queries';
import { z } from 'zod';

const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: 'File size should be less than 5MB',
    })
    .refine((file) => {
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      return validTypes.includes(file.type);
    }, {
      message: 'File type should be JPEG, PNG, GIF or PDF',
    }),
});

export async function POST(request: Request){
  try {
    const session = await getSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
        const errorMessage = validatedFile.error.issues
            .map((error) => error.message)
            .join(', ');

        return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const filename = `${Date.now()}_${file.name}`;
    const contentType = file.type || "application/octet-stream";
    const fileBuffer = await file.arrayBuffer();

    try {
      const blob = await put(filename, fileBuffer, {
        access: "public",
        addRandomSuffix: true,
        contentType,
      });

      return NextResponse.json({
        name: file.name,
        contentType: contentType,
        url: blob.url,
        size: file.size,
      });
    } catch (_error) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
