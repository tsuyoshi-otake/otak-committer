import * as fs from 'fs';
import * as path from 'path';
import { Module } from './dependency.types';

export function collectModules(
    currentDir: string,
    sourceRoot: string,
    modules: Map<string, Module>,
    extensions: string[],
    excludeDirs: string[],
): void {
    if (!fs.existsSync(currentDir)) {
        return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            if (excludeDirs.includes(entry.name)) {
                continue;
            }
            collectModules(fullPath, sourceRoot, modules, extensions, excludeDirs);
        } else if (entry.isFile()) {
            const ext = path.extname(entry.name);
            if (!extensions.includes(ext)) {
                continue;
            }
            const relativePath = path.relative(sourceRoot, fullPath);
            const dependencies = extractImports(fullPath, sourceRoot);
            modules.set(relativePath, {
                filePath: fullPath,
                relativePath,
                dependencies,
            });
        }
    }
}

export function extractImports(filePath: string, sourceRoot: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];

    const importPatterns = [
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    ];

    for (const pattern of importPatterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(content)) !== null) {
            const importPath = match[1];
            if (!importPath.startsWith('.')) {
                continue;
            }
            const resolvedPath = resolveImportPath(filePath, importPath, sourceRoot);
            if (resolvedPath) {
                imports.push(resolvedPath);
            }
        }
    }

    return imports;
}

export function resolveImportPath(
    fromFile: string,
    importPath: string,
    sourceRoot: string,
): string | null {
    const fromDir = path.dirname(fromFile);
    const absoluteImport = path.resolve(fromDir, importPath);
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];

    for (const ext of extensions) {
        const withExt = absoluteImport + ext;
        if (fs.existsSync(withExt)) {
            return path.relative(sourceRoot, withExt);
        }
    }

    for (const ext of extensions) {
        const indexPath = path.join(absoluteImport, `index${ext}`);
        if (fs.existsSync(indexPath)) {
            return path.relative(sourceRoot, indexPath);
        }
    }

    return null;
}
