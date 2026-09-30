"use strict";
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPathTranslator = createPathTranslator;
var path_1 = __importDefault(require("path"));
var typescript_1 = __importDefault(require("typescript"));
var pathTranslator_1 = require("../../classes/pathTranslator");
var assert_1 = require("./assert");
function findAncestorDir(dirs) {
    dirs = dirs.map(path_1.default.normalize).map(function (v) { return (v.endsWith(path_1.default.sep) ? v : v + path_1.default.sep); });
    var currentDir = dirs[0];
    while (!dirs.every(function (v) { return v.startsWith(currentDir); })) {
        currentDir = path_1.default.join(currentDir, "..");
    }
    return currentDir;
}
function getRootDirs(compilerOptions) {
    var _a;
    return compilerOptions.rootDir ? [compilerOptions.rootDir] : (_a = compilerOptions.rootDirs) !== null && _a !== void 0 ? _a : [];
}
/**
 * Creates translators for project references (`references` in tsconfig), such as sibling projects in a monorepo,
 * so that paths inside a referenced project are mapped to that project's `outDir` instead of our own.
 */
function createReferenceTranslators(references) {
    var e_1, _a;
    var translators = new Array();
    try {
        for (var _b = __values(references !== null && references !== void 0 ? references : []), _c = _b.next(); !_c.done; _c = _b.next()) {
            var reference = _c.value;
            if (!reference)
                continue;
            var commandLine = reference.commandLine;
            var options = commandLine.options;
            if (!options.outDir)
                continue;
            var commonSourceDirectory = typescript_1.default.getCommonSourceDirectoryOfConfig(commandLine, !typescript_1.default.sys.useCaseSensitiveFileNames);
            var rootDir = findAncestorDir(__spreadArray([commonSourceDirectory], __read(getRootDirs(options)), false));
            translators.push(new pathTranslator_1.PathTranslator(rootDir, options.outDir, undefined, options.declaration || false, createReferenceTranslators(reference.references)));
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return translators;
}
function createPathTranslator(program) {
    var compilerOptions = program.getCompilerOptions();
    var rootDirs = getRootDirs(compilerOptions);
    if (rootDirs.length === 0)
        (0, assert_1.assert)(false, "rootDir or rootDirs must be specified");
    var rootDir = findAncestorDir(__spreadArray([program.getCommonSourceDirectory()], __read(rootDirs), false));
    var outDir = compilerOptions.outDir;
    return new pathTranslator_1.PathTranslator(rootDir, outDir, undefined, compilerOptions.declaration || false, createReferenceTranslators(program.getResolvedProjectReferences()));
}
