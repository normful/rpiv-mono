import { StringEnum } from "@earendil-works/pi-ai";
import { type Static, Type } from "typebox";

// ---------------------------------------------------------------------------
// Tool / command identity — verbatim string boundaries.
// Tool name "todo" is the persistence key for branch replay (filtering
// `toolResult.toolName === "todo"`) AND the permissions entry at
// `templates/pi-permissions.jsonc:26`. DO NOT rename.
// ---------------------------------------------------------------------------

export const TOOL_NAME = "todo";
export const TOOL_LABEL = "Todo";
export const COMMAND_NAME = "todos";

/**
 * Custom session-entry type carrying the `details` snapshot of every
 * state-changing `todo` call — the replay source that survives calls made
 * through another tool (`ctx.executeTool`, e.g. Pi's codemode), whose results
 * never land on the branch as standalone `toolResult` messages. Persistence key
 * for branch replay, like `TOOL_NAME`. DO NOT rename.
 */
export const STATE_ENTRY_TYPE = "rpiv-todo-state";

// ---------------------------------------------------------------------------
// User-facing strings (kept stable for /todos UX parity).
// ---------------------------------------------------------------------------

export const ERR_REQUIRES_INTERACTIVE = "/todos requires interactive mode";
export const MSG_NO_TODOS = "No todos yet. Ask the agent to add some!";

// ---------------------------------------------------------------------------
// Public domain types
// ---------------------------------------------------------------------------

export type TaskStatus = "pending" | "in_progress" | "completed" | "deleted";

export type TaskAction = "create" | "update" | "list" | "get" | "delete" | "clear";

export interface Task {
	id: number;
	subject: string;
	description?: string;
	activeForm?: string;
	status: TaskStatus;
	blockedBy?: number[];
	owner?: string;
	metadata?: Record<string, unknown>;
}

/**
 * Persistence + replay snapshot. Every successful `todo` tool call returns this
 * shape under `details`; `state/replay.ts` reads the latest one from the branch
 * to reconstruct module state. Field order and field names are pinned by
 * cross-version replay compatibility.
 */
export interface TaskDetails {
	action: TaskAction;
	params: Record<string, unknown>;
	tasks: Task[];
	nextId: number;
	error?: string;
}

/**
 * Open-shape input bag the reducer accepts. Stays an interface so the index
 * signature (`[key: string]: unknown`) lets the runtime pass through TypeBox
 * `Static<typeof TodoParamsSchema>` without `as` casts.
 */
export interface TaskMutationParams {
	[key: string]: unknown;
	subject?: string;
	description?: string;
	activeForm?: string;
	status?: TaskStatus;
	blockedBy?: number[];
	addBlockedBy?: number[];
	removeBlockedBy?: number[];
	owner?: string;
	metadata?: Record<string, unknown>;
	id?: number;
	includeDeleted?: boolean;
}

// ---------------------------------------------------------------------------
// TypeBox parameter schema. `description` is LLM-facing prompt copy, so it is
// omitted wherever the parameter name already says it. Only hints the name
// cannot carry stay: requiredness, `status`'s update/list dual role, and
// `metadata`'s null-deletes-a-key rule.
// ---------------------------------------------------------------------------

export const TodoParamsSchema = Type.Object({
	action: StringEnum(["create", "update", "list", "get", "delete", "clear"] as const),
	subject: Type.Optional(Type.String({ description: "Required for create" })),
	description: Type.Optional(Type.String()),
	activeForm: Type.Optional(
		Type.String({
			description: "Present-continuous label shown while in_progress",
		}),
	),
	status: Type.Optional(
		StringEnum(["pending", "in_progress", "completed", "deleted"] as const, {
			description: "Set with update; filters with list",
		}),
	),
	blockedBy: Type.Optional(Type.Array(Type.Number())),
	addBlockedBy: Type.Optional(Type.Array(Type.Number())),
	removeBlockedBy: Type.Optional(Type.Array(Type.Number())),
	owner: Type.Optional(Type.String()),
	metadata: Type.Optional(
		Type.Record(Type.String(), Type.Unknown(), {
			description: "Merged into existing keys on update; a null value deletes that key",
		}),
	),
	id: Type.Optional(
		Type.Number({
			description: "Required for update, get, delete",
		}),
	),
	includeDeleted: Type.Optional(Type.Boolean()),
});

export type TodoParams = Static<typeof TodoParamsSchema>;
