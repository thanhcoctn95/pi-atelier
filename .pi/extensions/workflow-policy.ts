import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const orchestrationRelativePath = join(CONFIG_DIR_NAME, "docs", "ORCHESTRATION.md");
const projectRulesRelativePath = join(CONFIG_DIR_NAME, "docs", "PROJECT-RULES.md");
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
	orchestration?: string;
	projectRules?: string;
	unavailablePath?: string;
};

export default function workflowPolicy(pi: ExtensionAPI) {
	let policyState: PolicyState | undefined;

	const loadPolicy = async (cwd: string): Promise<PolicyState> => {
		try {
			const [orchestration, projectRules] = await Promise.all([
				readFile(join(cwd, orchestrationRelativePath), "utf8"),
				readFile(join(cwd, projectRulesRelativePath), "utf8"),
			]);
			return { cwd, available: true, orchestration, projectRules };
		} catch {
			for (const relativePath of [orchestrationRelativePath, projectRulesRelativePath]) {
				try {
					await readFile(join(cwd, relativePath), "utf8");
				} catch {
					return { cwd, available: false, unavailablePath: relativePath };
				}
			}
			return { cwd, available: false, unavailablePath: "required policy documents" };
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
				systemPrompt: `${event.systemPrompt}\n\n## Portable Pi Workflow Policy\n\n${state.orchestration}\n\n## Project Rules\n\n${state.projectRules}`,
			};
		}

		return {
			systemPrompt: `${event.systemPrompt}\n\n## Required Pi Guidance Unavailable\n\nThe trusted project's ${state.unavailablePath} file is missing or unreadable. Mutation and integrated orchestration tools are blocked until both ${orchestrationRelativePath} and ${projectRulesRelativePath} are restored. Read-only tools remain available for diagnosis and restoration.`,
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (!ctx.isProjectTrusted() || !blockedTools.has(event.toolName)) return;

		const state = await getPolicyState(ctx.cwd);
		if (!state.available) {
			return {
				block: true,
				reason: `Required Pi guidance missing or unreadable at ${state.unavailablePath}; ${event.toolName} is blocked until both ${orchestrationRelativePath} and ${projectRulesRelativePath} are restored.`,
			};
		}
	});
}
