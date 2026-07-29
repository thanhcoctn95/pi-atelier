import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundleRoot = path.join(root, ".pi");
const manifestPath = path.join(bundleRoot, "manifests", "skill-forks.json");
const skillsRoot = path.join(bundleRoot, "skills");
const errors = [];

async function readJson(filePath, label) {
	try {
		return JSON.parse(await readFile(filePath, "utf8"));
	} catch (error) {
		throw new Error(`Cannot read ${label} at ${path.relative(root, filePath)}: ${error.message}`);
	}
}

function isSha256(value) {
	return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function resolveRepoPath(relativePath, label) {
	if (typeof relativePath !== "string" || relativePath.length === 0) {
		errors.push(`${label}: path must be a non-empty string`);
		return undefined;
	}
	const resolved = path.resolve(root, relativePath);
	if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
		errors.push(`${label}: path escapes the repository: ${relativePath}`);
		return undefined;
	}
	return resolved;
}

function sortedKeys(value) {
	return Object.keys(value ?? {}).sort();
}

function addSetDifference(label, expected, actual) {
	for (const name of expected.filter((name) => !actual.includes(name))) {
		errors.push(`${label}: missing '${name}'`);
	}
	for (const name of actual.filter((name) => !expected.includes(name))) {
		errors.push(`${label}: unexpected '${name}'`);
	}
}

async function discoverSkills() {
	try {
		const entries = await readdir(skillsRoot, { withFileTypes: true });
		const names = [];
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			try {
				await readFile(path.join(skillsRoot, entry.name, "SKILL.md"), "utf8");
				names.push(entry.name);
			} catch {
				errors.push(`discovered skill '${entry.name}': missing readable .pi/skills/${entry.name}/SKILL.md`);
			}
		}
		return names.sort();
	} catch (error) {
		errors.push(`cannot read .pi/skills: ${error.message}`);
		return [];
	}
}

const manifest = await readJson(manifestPath, "fork manifest");
if (manifest.version !== 1) errors.push(`skill-forks.json: unsupported version ${String(manifest.version)}`);

const lockPath = resolveRepoPath(manifest.lockFile, "skill-forks.json lockFile");
const lock = lockPath ? await readJson(lockPath, "skills lock") : { skills: {} };
const forks = manifest.forks;
if (!forks || typeof forks !== "object" || Array.isArray(forks)) {
	errors.push("skill-forks.json: forks must be an object");
}

const lockNames = sortedKeys(lock.skills);
const forkNames = sortedKeys(forks);
const discoveredNames = await discoverSkills();
if (lockNames.length !== 22)
	errors.push(`skills lock: expected exactly 22 skills, found ${lockNames.length}`);
if (forkNames.length !== 22)
	errors.push(`skill-forks.json: expected exactly 22 forks, found ${forkNames.length}`);
if (discoveredNames.length !== 22)
	errors.push(`.pi/skills: expected exactly 22 skills, found ${discoveredNames.length}`);
addSetDifference("manifest compared with lock", lockNames, forkNames);
addSetDifference("discovered skills compared with lock", lockNames, discoveredNames);

const seenPaths = new Set();
for (const name of forkNames) {
	const fork = forks[name];
	const label = `fork '${name}'`;
	if (!fork || typeof fork !== "object" || Array.isArray(fork)) {
		errors.push(`${label}: entry must be an object`);
		continue;
	}

	const resolvedPath = resolveRepoPath(fork.path, label);
	if (resolvedPath && seenPaths.has(resolvedPath)) errors.push(`${label}: duplicate path ${fork.path}`);
	if (resolvedPath) seenPaths.add(resolvedPath);

	if (!isSha256(fork.upstreamHash)) errors.push(`${label}: upstreamHash must be a lowercase SHA-256`);
	if (!isSha256(fork.localHash)) errors.push(`${label}: localHash must be a lowercase SHA-256`);

	const locked = lock.skills?.[name];
	if (!locked) {
		errors.push(`${label}: missing from ${manifest.lockFile}`);
	} else {
		for (const field of ["source", "sourceType", "skillPath"]) {
			if (fork[field] !== locked[field]) {
				errors.push(
					`${label}: ${field} drifted (manifest=${JSON.stringify(fork[field])}, lock=${JSON.stringify(locked[field])})`,
				);
			}
		}
		if (fork.upstreamHash !== locked.computedHash) {
			errors.push(
				`${label}: upstream baseline changed (manifest=${fork.upstreamHash}, lock=${locked.computedHash})`,
			);
		}
	}

	const expectedPath = `.pi/skills/${name}/SKILL.md`;
	if (fork.path !== expectedPath) errors.push(`${label}: path must be ${expectedPath}`);
	if (resolvedPath) {
		try {
			const content = await readFile(resolvedPath);
			const actual = createHash("sha256").update(content).digest("hex");
			if (actual !== fork.localHash) {
				errors.push(`${label}: local content drifted (manifest=${fork.localHash}, actual=${actual})`);
			}
		} catch (error) {
			errors.push(`${label}: cannot read ${fork.path}: ${error.message}`);
		}
	}
}

errors.sort();
if (errors.length > 0) {
	console.error("Skill fork guard failed:");
	for (const error of errors) console.error(`- ${error}`);
	console.error(
		"\nDo not auto-update hashes. Review the upstream/local change, then update skill-forks.json deliberately.",
	);
	process.exit(1);
}

console.log("Skill forks verified (22 files)");
