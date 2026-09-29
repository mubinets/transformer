# PURPOSE
This is absolutely for testing/debugging only, not something to be used as a package in production version.

What changed compared to the original flamework transformer repo?

file: ``transformer/src/transformer.ts``
```diff
    . . .

    if (preEmitDiagnostics.some((x) => x.category === ts.DiagnosticCategory.Error)) {
        preEmitDiagnostics
-           .filter(ts.isDiagnosticWithLocation)
-           .forEach((diag) => context.addDiagnostic(diag));
+           .filter(function (d): d is DiagnosticWithLocation { return d.file !== undefined && d.start !== undefined && d.length !== undefined; })
+           .forEach((diag) => context.addDiagnostic(diag));
        return file;
    }
```

file: ``transformer/src/transformations/macros/intrinsics/paths.ts``
```diff
    . . .
    
	const outputPath = state.pathTranslator.getOutputPath(pathType.value);
	const rbxPath = state.rojoResolver?.getRbxPathFromFilePath(outputPath);
	
+   console.log("OUTPUT_PATH", outputPath);
+	console.log("RBX_PATH", rbxPath);

	if (!rbxPath) {
		Diagnostics.error(node, `Could not find Rojo data for '${pathType.value}'`);
	}
```

that's it.