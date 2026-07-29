import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

const orchestrationRelativePath = join(CONFIG_DIR_NAME, "docs", "ORCHESTRATION.md");
const projectRulesRelativePath = join(CONFIG_DIR_NAME, "docs", "PROJECT-RULES.md");
const settingsRelativePath = join(CONFIG_DIR_NAME, "settings.json");
const blockedTools = new Set([
	"edit",
	"write",
	"bash",
	"subagent",
	"subagent_wait",
	"subagent_supervisor",
	"contact_supervisor",
]);

export function oracleAutonomousDecisionsEnabled(settings: unknown): boolean {
	return (
		typeof settings === "object" &&
		settings !== null &&
		"oracleAutonomousDecisions" in settings &&
		(settings as { oracleAutonomousDecisions?: unknown }).oracleAutonomousDecisions === true
	);
}

export function oracleAutonomousDecisionGuidance(enabled: boolean): string {
	if (!enabled) return "";
	return `

## Oracle Autonomous Decision Flow

Project setting \`oracleAutonomousDecisions\` is enabled. This applies only when acting as the read-only \`oracle\` role; it does not authorize edits, writes, subagent launches, or implementation.

For ordinary open technical judgments within inherited requirements, make one decisive technical recommendation without contacting the supervisor. State assumptions instead of asking routine clarification questions. Escalate with \`contact_supervisor\` only when inherited requirements are irreconcilable, required evidence is unavailable and cannot be reasonably inferred, or the decision crosses a product, security, legal, destructive, or irreversible boundary.

Return a reviewable decision record with exactly these sections: Options considered; Selected decision; Rationale / evidence; Trade-offs; Assumptions; Confidence; Rejected alternatives; Review / reversal triggers. The parent/runtime must persist the complete oracle result as a runtime-owned Markdown artifact at \`.pi-subagents/decisions/<stable-run-id-or-timestamp>.md\`, validate that it is nonempty, and make it available for independent review. Do not write that artifact yourself and do not treat persistence as permission to modify project files.`;
}

export type PolicyState = {
	cwd: string;
	available: boolean;
	orchestration?: string;
	projectRules?: string;
	oracleAutonomousDecisions: boolean;
	unavailablePath?: string;
};

export async function loadPolicyState(cwd: string): Promise<PolicyState> {
	let orchestration: string;
	let projectRules: string;
	try {
		[orchestration, projectRules] = await Promise.all([
			readFile(join(cwd, orchestrationRelativePath), "utf8"),
			readFile(join(cwd, projectRulesRelativePath), "utf8"),
		]);
	} catch {
		for (const relativePath of [orchestrationRelativePath, projectRulesRelativePath]) {
			try {
				await readFile(join(cwd, relativePath), "utf8");
			} catch {
				return {
					cwd,
					available: false,
					oracleAutonomousDecisions: false,
					unavailablePath: relativePath,
				};
			}
		}
		return {
			cwd,
			available: false,
			oracleAutonomousDecisions: false,
			unavailablePath: "required policy documents",
		};
	}

	let settings: unknown;
	try {
		settings = JSON.parse(await readFile(join(cwd, settingsRelativePath), "utf8"));
	} catch {
		// Settings are optional here; missing, unreadable, or malformed values use the conservative default.
	}

	return {
		cwd,
		available: true,
		orchestration,
		projectRules,
		oracleAutonomousDecisions: oracleAutonomousDecisionsEnabled(settings),
	};
}

export default function workflowPolicy(pi: ExtensionAPI) {
	let policyState: PolicyState | undefined;

	const getPolicyState = async (cwd: string) => {
		if (!policyState || policyState.cwd !== cwd) policyState = await loadPolicyState(cwd);
		return policyState;
	};

	pi.on("session_start", async (_event, ctx) => {
		policyState = ctx.isProjectTrusted() ? await loadPolicyState(ctx.cwd) : undefined;
	});

	pi.on("before_agent_start", async (event, ctx) => {
		if (!ctx.isProjectTrusted()) return;

		const state = await getPolicyState(ctx.cwd);
		if (state.available) {
			return {
				systemPrompt: `${event.systemPrompt}\n\n## Portable Pi Workflow Policy\n\n${state.orchestration}\n\n## Project Rules\n\n${state.projectRules}${oracleAutonomousDecisionGuidance(state.oracleAutonomousDecisions)}`,
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
