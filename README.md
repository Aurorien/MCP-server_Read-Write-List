# MCP-server Read/Write/List files

An MCP-server that allows Claude to read, write or list files in a specified directory.

## Instructions

1. Clone repo 
2. Navigate to repo in a terminal and install dependencies by running `npm install`.
3. Add .env file where you set ALLOWED_DIRECTORY to the directory you want Claude to have access to.
4. Build the solution by running `npm run build`.
5. Edit claude_desktop_config.json which you can find through Claude Desktop interface in the Developer section, or in a file explorer. Add MCP server configuration:

```
{
  "mcpServers": {
    "file-access": {
      "command": "node",
      "args": ["/absolute/path/to/your/mcpserver/dist/index.js"]
    }
  }
}
```
6. Restart Claude Desktop completely (quit and reopen)
7. Ready to use! Ask Claude eg. info of the files, list files or change in files. 
