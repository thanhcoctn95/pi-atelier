import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
	loadPolicyState,
	oracleAutonomousDecisionGuidance,
	oracleAutonomousDecisionsEnabled,
} from "../.pi/extensions/workflow-policy.js";

const temporaryDirectories: string[] = [];

async function createPolicyProject(settings?: string) {
	const cwd = await mkdtemp(join(tmpdir(), "pi-workflow-policy-"));
	temporaryDirectories.push(cwd);
	await mkdir(join(cwd, ".pi", "docs"), { recursive: true });
	await writeFile(join(cwd, ".pi", "docs", "ORCHESTRATION.md"), "orchestration");
	await writeFile(join(cwd, ".pi", "docs", "PROJECT-RULES.md"), "project rules");
	if (settings !== undefined) await writeFile(join(cwd, ".pi", "settings.json"), settings);
	return cwd;
}

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true })));
});

describe("oracle autonomous decision policy", () => {
	it("enables only an explicit true top-level setting", () => {
		expect(oracleAutonomousDecisionsEnabled({ oracleAutonomousDecisions: true })).toBe(true);
		expect(oracleAutonomousDecisionsEnabled({ oracleAutonomousDecisions: false })).toBe(false);
		expect(oracleAutonomousDecisionsEnabled({ oracleAutonomousDecisions: "true" })).toBe(false);
		expect(oracleAutonomousDecisionsEnabled({ subagents: { oracleAutonomousDecisions: true } })).toBe(false);
		expect(oracleAutonomousDecisionsEnabled(null)).toBe(false);
	});

	it("keeps required policy guidance available when settings are absent or malformed", async () => {
		const missingSettingsProject = await createPolicyProject();
		const malformedSettingsProject = await createPolicyProject("{ invalid json");

		await expect(loadPolicyState(missingSettingsProject)).resolves.toMatchObject({
			available: true,
			oracleAutonomousDecisions: false,
			orchestration: "orchestration",
			projectRules: "project rules",
		});
		await expect(loadPolicyState(malformedSettingsProject)).resolves.toMatchObject({
			available: true,
			oracleAutonomousDecisions: false,
			orchestration: "orchestration",
			projectRules: "project rules",
		});
	});

	it("enables autonomous decisions only from valid optional settings", async () => {
		const cwd = await createPolicyProject('{ "oracleAutonomousDecisions": true }');

		await expect(loadPolicyState(cwd)).resolves.toMatchObject({
			available: true,
			oracleAutonomousDecisions: true,
		});
	});

	it("injects decisive but bounded read-only oracle guidance when enabled", () => {
		const guidance = oracleAutonomousDecisionGuidance(true);

		expect(guidance).toContain("make one decisive technical recommendation");
		expect(guidance).toContain(
			"make one decisive technical recommendation without contacting the supervisor",
		);
		expect(guidance).toContain("product, security, legal, destructive, or irreversible boundary");
		expect(guidance).toContain("does not authorize edits, writes, subagent launches, or implementation");
		expect(guidance).toContain(".pi-subagents/decisions/<stable-run-id-or-timestamp>.md");
		for (const heading of [
			"Options considered",
			"Selected decision",
			"Rationale / evidence",
			"Trade-offs",
			"Assumptions",
			"Confidence",
			"Rejected alternatives",
			"Review / reversal triggers",
		]) {
			expect(guidance).toContain(heading);
		}
	});

	it("does not inject autonomous guidance when disabled", () => {
		expect(oracleAutonomousDecisionGuidance(false)).toBe("");
	});
});
