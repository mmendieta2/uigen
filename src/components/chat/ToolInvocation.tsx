"use client";

import { ToolInvocation as ToolInvocationType } from "ai";
import { Loader2 } from "lucide-react";

function basename(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] || path;
}

export function getToolMessage(
  toolName: string,
  args: Record<string, any> | undefined
): string {
  const path = args?.path;

  if (toolName === "str_replace_editor" && typeof path === "string") {
    const name = basename(path);
    switch (args?.command) {
      case "create":
        return `Creating ${name}`;
      case "str_replace":
      case "insert":
        return `Editing ${name}`;
      case "view":
        return `Viewing ${name}`;
      case "undo_edit":
        return `Undoing changes to ${name}`;
    }
  }

  if (toolName === "file_manager" && typeof path === "string") {
    const name = basename(path);
    switch (args?.command) {
      case "rename": {
        const newName =
          typeof args?.new_path === "string" ? basename(args.new_path) : null;
        return newName ? `Renaming ${name} to ${newName}` : `Renaming ${name}`;
      }
      case "delete":
        return `Deleting ${name}`;
    }
  }

  return toolName;
}

interface ToolInvocationProps {
  toolInvocation: ToolInvocationType;
}

export function ToolInvocation({ toolInvocation }: ToolInvocationProps) {
  const isComplete =
    toolInvocation.state === "result" && toolInvocation.result;
  const message = getToolMessage(toolInvocation.toolName, toolInvocation.args);

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isComplete ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{message}</span>
    </div>
  );
}
