import path from "path";
import ts from "typescript";
import { PathTranslator } from "../../classes/pathTranslator";
import { assert } from "./assert";

function findAncestorDir(dirs: Array<string>) {
	dirs = dirs.map(path.normalize).map((v) => (v.endsWith(path.sep) ? v : v + path.sep));
	let currentDir = dirs[0];
	while (!dirs.every((v) => v.startsWith(currentDir))) {
		currentDir = path.join(currentDir, "..");
	}
	return currentDir;
}

function getRootDirs(compilerOptions: ts.CompilerOptions) {
	return compilerOptions.rootDir ? [compilerOptions.rootDir] : compilerOptions.rootDirs ?? [];
}

/**
 * Creates translators for project references (`references` in tsconfig), such as sibling projects in a monorepo,
 * so that paths inside a referenced project are mapped to that project's `outDir` instead of our own.
 */
function createReferenceTranslators(
	references: ReadonlyArray<ts.ResolvedProjectReference | undefined> | undefined,
): Array<PathTranslator> {
	const translators = new Array<PathTranslator>();
	for (const reference of references ?? []) {
		if (!reference) continue;

		const { commandLine } = reference;
		const { options } = commandLine;
		if (!options.outDir) continue;

		const commonSourceDirectory = ts.getCommonSourceDirectoryOfConfig(
			commandLine,
			!ts.sys.useCaseSensitiveFileNames,
		);
		const rootDir = findAncestorDir([commonSourceDirectory, ...getRootDirs(options)]);
		translators.push(
			new PathTranslator(
				rootDir,
				options.outDir,
				undefined,
				options.declaration || false,
				createReferenceTranslators(reference.references),
			),
		);
	}
	return translators;
}

export function createPathTranslator(program: ts.Program) {
	const compilerOptions = program.getCompilerOptions();
	const rootDirs = getRootDirs(compilerOptions);
	if (rootDirs.length === 0) assert(false, "rootDir or rootDirs must be specified");

	const rootDir = findAncestorDir([program.getCommonSourceDirectory(), ...rootDirs]);
	const outDir = compilerOptions.outDir!;
	return new PathTranslator(
		rootDir,
		outDir,
		undefined,
		compilerOptions.declaration || false,
		createReferenceTranslators(program.getResolvedProjectReferences()),
	);
}
