import type { ZodRawShape } from "zod";

/**
 * A registrable MCP tool. `inputSchema` is a zod raw shape (object of zod
 * fields), matching the McpServer.registerTool signature. `handler` returns a
 * plain object that the registry serializes into MCP text content.
 */
export interface ToolDef<Shape extends ZodRawShape = ZodRawShape> {
  name: string;
  title: string;
  description: string;
  inputSchema: Shape;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export function defineTool<Shape extends ZodRawShape>(
  def: ToolDef<Shape>,
): ToolDef<Shape> {
  return def;
}
