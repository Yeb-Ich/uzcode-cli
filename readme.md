# uzcode-cli

> Local LLM coding agent for CLI — powered by LM Studio + Qwen3

Autonomous coding agent that runs in your terminal. Connects to a local model
via LM Studio, supports tool calling (file operations + shell commands),
reasoning display, and safe confirmation prompts.

## Architecture

```
source/
  cli.tsx              Entry point (meow CLI flags)
  app.tsx              Root React Ink component + state
  types/
    index.ts           Shared TypeScript types
  agent/
    client.ts          OpenAI client factory (LM Studio)
    loop.ts            Recursive agent loop (tool calling)
    prompt.ts          System prompt
  tools/
    index.ts           Tool definitions + handler registry
    file-tree.ts       Directory tree builder
    list-files.ts      list_files tool
    read-file.ts       read_file tool
    write-file.ts      write_file tool (requires y/n)
    execute-command.ts execute_command tool (requires y/n)
  ui/
    log-panel.tsx      Log items display
    approval-panel.tsx y/n confirmation panel
    spinner-row.tsx    Loading spinner
    prompt-input.tsx   TextInput wrapper
```

## Prerequisites

- **Node.js** >= 16
- **LM Studio** running with a loaded model (e.g. `qwen/qwen3-14b`)
  - Server address: `http://127.0.0.1:1234/v1`

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Run

```bash
# Interactive mode — type your prompt inside the app
npm start

# Pass a prompt directly from the command line
node dist/cli.js "List all files in the current directory"

# Specify a different model
node dist/cli.js --model=qwen/qwen3-14b "Fix the build errors"
```

## How to verify changes

1. **Build check** — make sure TypeScript compiles without errors:
   ```bash
   npm run build
   ```

2. **Quick smoke test** — start the CLI and type a prompt:
   ```bash
   npm start
   ```
   Then type: `List files in the current directory` and press Enter.
   You should see the agent call `list_files`, display the result, and return
   a final answer.

3. **Safety check** — when the agent calls `write_file` or `execute_command`,
   a confirmation prompt appears. Type `n` to deny and verify the operation
   is blocked.

4. **Reasoning check** — if the model returns `reasoning_content`, it will be
   displayed in a gray-bordered box before the final answer.

## Dev mode (watch)

```bash
npm run dev
```

## License

MIT
