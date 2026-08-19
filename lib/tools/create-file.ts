import { tool } from 'ai';
import { z } from 'zod';
import { Sandbox } from '@vercel/sandbox';

const createFileSchema = z.object({
  path: z
    .string()
    .describe('Workspace-relative path to the file to create (e.g., "src/index.ts")'),
  content: z
    .string()
    .describe('The content to write to the file'),
  sandboxName: z
    .string()
    .describe('The name of the sandbox to create the file in (e.g., "sbx_xxx")'),
});

// Deteksi apakah konten berisi JSX/TSX (React components, JSX elements, SVG, etc.)
function containsJSX(content: string): boolean {
  // Pola JSX: <div>, <span>, <Component />, <svg>, <Icon />, React.createElement, etc.
  const jsxPatterns = [
    /<[A-Z][A-Za-z0-9]*\s*[^>]*>/, // <Component ...>
    /<[a-z][a-z0-9-]*\s+[^>]*>/, // <div ...> (dengan atribut)
    /<[a-z][a-z0-9-]*>/, // <div> (tanpa atribut)
    /<\/[a-z][a-z0-9-]*>/, // </div>
    /<svg[\s>]/i, // <svg
    /<img[\s>]/i, // <img
    /<button[\s>]/i, // <button
    /<input[\s>]/i, // <input
    /<form[\s>]/i, // <form
    /<a[\s>]/i, // <a
    /<h[1-6][\s>]/i, // <h1> - <h6>
    /<p[\s>]/i, // <p
    /<span[\s>]/i, // <span
    /<div[\s>]/i, // <div
    /<ul[\s>]/i, // <ul
    /<li[\s>]/i, // <li
    /<table[\s>]/i, // <table
    /<tr[\s>]/i, // <tr
    /<td[\s>]/i, // <td
    /<th[\s>]/i, // <th
    /<thead[\s>]/i, // <thead
    /<tbody[\s>]/i, // <tbody
    /<label[\s>]/i, // <label
    /<select[\s>]/i, // <select
    /<option[\s>]/i, // <option
    /<textarea[\s>]/i, // <textarea
    /<nav[\s>]/i, // <nav
    /<header[\s>]/i, // <header
    /<footer[\s>]/i, // <footer
    /<main[\s>]/i, // <main
    /<section[\s>]/i, // <section
    /<article[\s>]/i, // <article
    /<aside[\s>]/i, // <aside
    /<figure[\s>]/i, // <figure
    /<figcaption[\s>]/i, // <figcaption
    /<video[\s>]/i, // <video
    /<audio[\s>]/i, // <audio
    /<canvas[\s>]/i, // <canvas
    /<iframe[\s>]/i, // <iframe
    /<style[\s>]/i, // <style
    /<script[\s>]/i, // <script
    /<link[\s>]/i, // <link
    /<meta[\s>]/i, // <meta
    /<title[\s>]/i, // <title
    /<br[\s>]/i, // <br
    /<hr[\s>]/i, // <hr
    /<em[\s>]/i, // <em
    /<strong[\s>]/i, // <strong
    /<b[\s>]/i, // <b
    /<i[\s>]/i, // <i
    /<u[\s>]/i, // <u
    /<code[\s>]/i, // <code
    /<pre[\s>]/i, // <pre
    /<blockquote[\s>]/i, // <blockquote
    /<ol[\s>]/i, // <ol
    /<dl[\s>]/i, // <dl
    /<dt[\s>]/i, // <dt
    /<dd[\s>]/i, // <dd
    /<React\.Fragment[\s>]/, // <React.Fragment>
    /<Fragment[\s>]/, // <Fragment>
    /<Suspense[\s>]/, // <Suspense>
    /<ErrorBoundary[\s>]/, // <ErrorBoundary>
    /React\.createElement\s*\(/, // React.createElement(
    /createElement\s*\(/, // createElement(
    /\.map\s*\(\s*\([^)]*\)\s*=>\s*</, // .map((item) => <
    /=>\s*</, // => < (arrow function returning JSX)
    /return\s*\(?\s*</, // return ( <
    /return\s*</, // return <
  ];

  return jsxPatterns.some((pattern) => pattern.test(content));
}

export const createFileTool = tool({
  description: `Create a file inside the sandbox.

  USAGE:
  - Creates or replaces a file at the specified path
  - Supports any file type (source code, config, markdown, JSON, etc.)
  - Uses workspace-relative paths

  CRITICAL RULES:
  - NEVER write JSX or SVG inside a .ts file.
  - All files containing JSX, ReactNode, React Element, <svg>, <div>, <Icon />, or React components MUST use the .tsx extension.
  - .ts files may only contain pure TypeScript without JSX.
  - If a file contains JSX, use the .tsx extension (not .ts).
  - For Vite config, use vite.config.ts and ensure package.json has "type": "module".

  EXAMPLES:
  - path: "src/index.ts", content: "console.log('hello')"
  - path: "src/App.tsx", content: "export function App() { return <div>Hello</div> }"
  - path: "package.json", content: "{...}"
  - path: "README.md", content: "# My Project"`,
  inputSchema: createFileSchema,
  execute: async ({ path, content, sandboxName }: z.infer<typeof createFileSchema>) => {
    console.log('=== TOOL: createFile ===');
    console.log('INPUT:', JSON.stringify({ sandboxName, path, contentLength: content?.length }));
    console.log('CONTENT_PREVIEW:', JSON.stringify(content?.substring(0, 200)));

    // Auto-correct: jika file .ts berisi JSX, ubah ke .tsx
    let finalPath = path;
    if (path.endsWith('.ts') && !path.endsWith('.d.ts') && containsJSX(content)) {
      finalPath = path.slice(0, -3) + '.tsx';
      console.log(`WARNING: File ${path} contains JSX. Auto-correcting to ${finalPath}`);
    }

    // Note: vite.config.ts is fine as long as package.json has "type": "module".
    // No auto-correction needed for vite.config.ts.

    try {
      const sandbox = await Sandbox.get({
        name: sandboxName,
      });

      await sandbox.writeFiles([
        {
          path: finalPath,
          content: Buffer.from(content),
        },
      ]);

      console.log('OUTPUT:', JSON.stringify({ success: true, path: finalPath }));
      return {
        success: true,
        path: finalPath,
        content: content,
        message: `Successfully created file at ${finalPath}${finalPath !== path ? ` (auto-corrected from ${path})` : ''}`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log('ERROR:', message);
      return {
        success: false,
        error: `Failed to create file: ${message}`,
      };
    }
  },
});
