"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathTranslator = exports.PathInfo = void 0;
var path_1 = __importDefault(require("path"));
var constants_1 = require("./constants");
var assert_1 = require("../../util/functions/assert");
var isPathDescendantOf_1 = require("../../util/functions/isPathDescendantOf");
var PathInfo = /** @class */ (function () {
    function PathInfo(dirName, fileName, exts) {
        this.dirName = dirName;
        this.fileName = fileName;
        this.exts = exts;
    }
    PathInfo.from = function (filePath) {
        var dirName = path_1.default.dirname(filePath);
        var parts = filePath.slice(dirName.length + path_1.default.sep.length).split(".");
        var fileName = parts.shift();
        var exts = parts.map(function (v) { return "." + v; });
        (0, assert_1.assert)(fileName !== undefined);
        return new PathInfo(dirName, fileName, exts);
    };
    PathInfo.prototype.extsPeek = function (depth) {
        if (depth === void 0) { depth = 0; }
        return this.exts[this.exts.length - (depth + 1)];
    };
    PathInfo.prototype.join = function () {
        return path_1.default.join(this.dirName, __spreadArray([this.fileName], __read(this.exts), false).join(""));
    };
    return PathInfo;
}());
exports.PathInfo = PathInfo;
var PathTranslator = /** @class */ (function () {
    function PathTranslator(rootDir, outDir, buildInfoOutputPath, declaration, projectReferences) {
        if (projectReferences === void 0) { projectReferences = []; }
        this.rootDir = rootDir;
        this.outDir = outDir;
        this.buildInfoOutputPath = buildInfoOutputPath;
        this.declaration = declaration;
        this.projectReferences = projectReferences;
    }
    PathTranslator.prototype.makeRelativeFactory = function (from, to) {
        if (from === void 0) { from = this.rootDir; }
        if (to === void 0) { to = this.outDir; }
        return function (pathInfo) { return path_1.default.join(to, path_1.default.relative(from, pathInfo.join())); };
    };
    /**
     * Finds the translator of the project (this one, or a referenced project) whose directory contains `filePath`.
     */
    PathTranslator.prototype.findProject = function (filePath, getDir) {
        var e_1, _a;
        if ((0, isPathDescendantOf_1.isPathDescendantOf)(path_1.default.resolve(filePath), getDir(this))) {
            return this;
        }
        try {
            for (var _b = __values(this.projectReferences), _c = _b.next(); !_c.done; _c = _b.next()) {
                var reference = _c.value;
                var project = reference.findProject(filePath, getDir);
                if (project)
                    return project;
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    /**
     * Maps an input path to an output path
     * - `.tsx?` && !`.d.tsx?` -> `.lua`
     * 	- `index` -> `init`
     * - `src/*` -> `out/*`
     */
    PathTranslator.prototype.getOutputPath = function (filePath) {
        var project = this.findProject(filePath, function (translator) { return translator.rootDir; });
        if (project && project !== this)
            return project.getOutputPath(filePath);
        var makeRelative = this.makeRelativeFactory();
        var pathInfo = PathInfo.from(filePath);
        if ((pathInfo.extsPeek() === constants_1.TS_EXT || pathInfo.extsPeek() === constants_1.TSX_EXT) && pathInfo.extsPeek(1) !== constants_1.D_EXT) {
            pathInfo.exts.pop(); // pop .tsx?
            // index -> init
            if (pathInfo.fileName === constants_1.INDEX_NAME) {
                pathInfo.fileName = constants_1.INIT_NAME;
            }
            pathInfo.exts.push(constants_1.LUA_EXT);
        }
        return makeRelative(pathInfo);
    };
    /**
     * Maps an output path to possible import paths
     * - `.lua` -> `.tsx?`
     * 	- `init` -> `index`
     * - `out/*` -> `src/*`
     */
    PathTranslator.prototype.getInputPaths = function (filePath) {
        var project = this.findProject(filePath, function (translator) { return translator.outDir; });
        if (project && project !== this)
            return project.getInputPaths(filePath);
        var makeRelative = this.makeRelativeFactory(this.outDir, this.rootDir);
        var possiblePaths = new Array();
        var pathInfo = PathInfo.from(filePath);
        // index.*.lua cannot come from a .ts file
        if (pathInfo.extsPeek() === constants_1.LUA_EXT && pathInfo.fileName !== constants_1.INDEX_NAME) {
            pathInfo.exts.pop();
            var originalFileName = pathInfo.fileName;
            // init -> index
            if (pathInfo.fileName === constants_1.INIT_NAME) {
                pathInfo.fileName = constants_1.INDEX_NAME;
            }
            // .ts
            pathInfo.exts.push(constants_1.TS_EXT);
            possiblePaths.push(makeRelative(pathInfo));
            pathInfo.exts.pop();
            // .tsx
            pathInfo.exts.push(constants_1.TSX_EXT);
            possiblePaths.push(makeRelative(pathInfo));
            pathInfo.exts.pop();
            pathInfo.fileName = originalFileName;
            pathInfo.exts.push(constants_1.LUA_EXT);
        }
        if (this.declaration) {
            if ((pathInfo.extsPeek() === constants_1.TS_EXT || pathInfo.extsPeek() === constants_1.TSX_EXT) && pathInfo.extsPeek(1) === constants_1.D_EXT) {
                var tsExt = pathInfo.exts.pop(); // pop .tsx?
                (0, assert_1.assert)(tsExt);
                pathInfo.exts.pop(); // pop .d
                // .ts
                pathInfo.exts.push(constants_1.TS_EXT);
                possiblePaths.push(makeRelative(pathInfo));
                pathInfo.exts.pop();
                // .tsx
                pathInfo.exts.push(constants_1.TSX_EXT);
                possiblePaths.push(makeRelative(pathInfo));
                pathInfo.exts.pop();
                pathInfo.exts.push(constants_1.D_EXT);
                pathInfo.exts.push(tsExt);
            }
        }
        possiblePaths.push(makeRelative(pathInfo));
        return possiblePaths;
    };
    /**
     * Maps a src path to an import path
     * - `.d.tsx?` -> `.tsx?` -> `.lua`
     * 	- `index` -> `init`
     */
    PathTranslator.prototype.getImportPath = function (filePath, isNodeModule) {
        if (isNodeModule === void 0) { isNodeModule = false; }
        var project = this.findProject(filePath, function (translator) { return translator.rootDir; });
        if (project && project !== this)
            return project.getImportPath(filePath, isNodeModule);
        var makeRelative = this.makeRelativeFactory();
        var pathInfo = PathInfo.from(filePath);
        if (pathInfo.extsPeek() === constants_1.TS_EXT || pathInfo.extsPeek() === constants_1.TSX_EXT) {
            pathInfo.exts.pop(); // pop .tsx?
            if (pathInfo.extsPeek() === constants_1.D_EXT) {
                pathInfo.exts.pop(); // pop .d
            }
            // index -> init
            if (pathInfo.fileName === constants_1.INDEX_NAME) {
                pathInfo.fileName = constants_1.INIT_NAME;
            }
            pathInfo.exts.push(constants_1.LUA_EXT); // push .lua
        }
        return isNodeModule ? pathInfo.join() : makeRelative(pathInfo);
    };
    return PathTranslator;
}());
exports.PathTranslator = PathTranslator;
