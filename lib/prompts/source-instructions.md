# SOURCE REPOSITORY — CRITICAL: YOU MUST USE THIS

The user has selected a GitHub repository to use as the source for the sandbox:
- Repository: {{repositoryName}}
- URL: {{url}}

## MANDATORY INSTRUCTION

When you call createSandbox, you MUST include the 'source' parameter. This is NOT optional.

Use EXACTLY this:
```
createSandbox({ runtime: "node24", source: { url: "{{url}}", type: "git", username: "x-access-token", password: "{{password}}" } })
```

FAILURE TO INCLUDE source WILL RESULT IN A BROKEN EXPERIENCE.

After the sandbox is created with the source, the repository will be cloned automatically. Do NOT create project files manually — they already exist in the cloned repo. Instead:
1. Read existing files with readFile
2. Modify files with createFile if needed
3. Install dependencies with npm install
4. Start the dev server

But the initial project setup (package.json, etc.) should already be in the cloned repository.