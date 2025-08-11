// MCP server for changing files in a certain directory

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allowed directory whose files Claude can operate on
const ALLOWED_DIRECTORY =
  process.env.ALLOWED_DIRECTORY ??
  (() => {
    throw new Error("ALLOWED_DIRECTORY environment variable is required");
  })();

// Helper function to ensure file is within allowed directory
function validatePath(filePath: string): string {
  const resolvedPath = path.resolve(filePath);
  const allowedPath = path.resolve(ALLOWED_DIRECTORY);

  if (!resolvedPath.startsWith(allowedPath)) {
    throw new Error(
      `Access denied: Path ${filePath} is outside allowed directory`
    );
  }

  return resolvedPath;
}

const server = new McpServer({
  name: "file-access-server",
  version: "1.0.0",
  capabilities: {
    tools: {},
  },
});

server.tool(
  "read_file",
  "Read the contents of a file",
  {
    path: z.string().describe("Path to the file to read"),
  },
  async ({ path: filePath }) => {
    try {
      const validatedPath = validatePath(filePath);
      const content = await fs.readFile(validatedPath, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `File: ${filePath}\n\n${content}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error reading file ${filePath}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "write_file",
  "Write content to a file, creating it if it doesn't exist",
  {
    path: z.string().describe("Path to the file to write"),
    content: z.string().describe("Content to write to the file"),
  },
  async ({ path: filePath, content }) => {
    try {
      const validatedPath = validatePath(filePath);

      // Ensure directory exists
      const directory = path.dirname(validatedPath);
      await fs.mkdir(directory, { recursive: true });

      // Write the file
      await fs.writeFile(validatedPath, content, "utf-8");

      return {
        content: [
          {
            type: "text",
            text: `Successfully wrote to file: ${filePath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Error writing file ${filePath}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.tool(
  "list_files",
  "List files and directories in a given path",
  {
    path: z
      .string()
      .optional()
      .describe("Path to list (defaults to allowed directory)"),
  },
  async ({ path: dirPath = "." }) => {
    try {
      // Debug info - show what paths we're working with
      const debugInfo = `Debug info:
- ALLOWED_DIRECTORY: ${ALLOWED_DIRECTORY}
- Requested path: ${dirPath}
- process.cwd(): ${process.cwd()}
- __dirname: ${__dirname}`;

      const validatedPath = validatePath(dirPath);
      const items = await fs.readdir(validatedPath, { withFileTypes: true });

      const fileList = items.map((item) => ({
        name: item.name,
        type: item.isDirectory() ? "directory" : "file",
      }));

      const formattedList = fileList
        .map(
          (item) => `${item.type === "directory" ? "📁" : "📄"} ${item.name}`
        )
        .join("\n");

      return {
        content: [
          {
            type: "text",
            text: `${debugInfo}\n\nContents of ${dirPath} (resolved to ${validatedPath}):\n\n${formattedList}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      return {
        content: [
          {
            type: "text",
            text: `Debug info:
- ALLOWED_DIRECTORY: ${ALLOWED_DIRECTORY}
- Requested path: ${dirPath}
- process.cwd(): ${process.cwd()}
- __dirname: ${__dirname}

Error listing directory ${dirPath}: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("File Access MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
