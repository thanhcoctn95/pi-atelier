import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const policyRelativePath = join(CONFIG_DIR_NAME, "docs", "ORCHESTRATION.md");
const blockedTools = new Set([
	"edit",
	"write",
	"bash",
	"subagent",
	"subagent_wait",
	"subagent_supervisor",
	"contact_supervisor",
]);

type PolicyState = {
	cwd: string;
	available: boolean;
	content?: string;
};

export default function workflowPolicy(pi: ExtensionAPI) {
	let policyState: PolicyState | undefined;

	const loadPolicy = async (cwd: string): Promise<PolicyState> => {
		try {
			const content = await readFile(join(cwd, policyRelativePath), "utf8");
			return { cwd, available: true, content };
		} catch {
			return { cwd, available: false };
		}
	};

	const getPolicyState = async (cwd: string) => {
		if (!policyState || policyState.cwd !== cwd) policyState = await loadPolicy(cwd);
		return policyState;
	};

	pi.on("session_start", async (_event, ctx) => {
		policyState = ctx.isProjectTrusted() ? await loadPolicy(ctx.cwd) : undefined;
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (!ctx.isProjectTrusted()) return;

		const state = await getPolicyState(ctx.cwd);
		if (state.available) {
			return {
				systemPrompt: `${event.systemPrompt}\n\n## Portable Pi Workflow Policy\n\n${state.content}`,
			};
		}

		return {
			systemPrompt: `${event.systemPrompt}\n\n## Portable Pi Workflow Policy Unavailable\n\nThe trusted project's ${policyRelativePath} file is missing or unreadable. Mutation and integrated orchestration tools are blocked until the portable workflow policy is restored. Read-only tools remain available for diagnosis and restoration.`,
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!ctx.isProjectTrusted() || !blockedTools.has(event.toolName)) return;

		const state = await getPolicyState(ctx.cwd);
		if (!state.available) {
			return {
				block: true,
				reason: `Portable workflow policy missing or unreadable at ${policyRelativePath}; ${event.toolName} is blocked until it is restored.`,
			};
		}
	});
}
