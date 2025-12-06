/**
 * Dependency Analyzer Utility
 * 
 * Analyzes module dependencies in the TypeScript codebase to detect
 * circular dependencies and validate architectural constraints.
 * 
 * This utility is used by property-based tests to ensure the codebase
 * maintains a clean, acyclic dependency graph.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a module in the dependency graph
 */
export interface Module {
    /** Absolute file path */
    filePath: string;
    /** Relative path from source root */
    relativePath: string;
    /** List of modules this module imports */
    dependencies: string[];
}

/**
 * Represents a circular dependency cycle
 */
export interface DependencyCycle {
    /** Array of module paths forming the cycle */
    cycle: string[];
    /** Human-readable description of the cycle */
    description: string;
}

/**
 * Result of dependency analysis
 */
export interface DependencyAnalysisResult {
    /** Map of module path to Module object */
    modules: Map<string, Module>;
    /** List of detected circular dependencies */
    cycles: DependencyCycle[];
    /** Total number of modules analyzed */
    moduleCount: number;
    /** Total number of dependencies */
    dependencyCount: number;
}

/**
 * Analyzes module dependencies in a directory
 * 
 * @param sourceDir - The source directory to analyze (e.g., './src')
 * @param options - Analysis options
 * @returns Analysis result with modules and detected cycles
 * 
 * @example
 * ```typescript
 * const result = analyzeModuleDependencies('./src');
 * console.log(`Found ${result.cycles.length} circular dependencies`);
 * ```
 */
export function analyzeModuleDependencies(
    sourceDir: string,
    options: {
        /** File extensions to analyze */
        extensions?: string[];
        /** Directories to exclude */
        excludeDirs?: string[];
    } = {}
): DependencyAnalysisResult {
    const {
        extensions = ['.ts', '.tsx'],
        excludeDirs = ['node_modules', 'out', 'dist', '__tests__', '.vscode-test']
    } = options;

    const modules = new Map<string, Module>();
    const absoluteSourceDir = path.resolve(sourceDir);

    // Step 1: Collect all TypeScript files and their imports
    collectModules(absoluteSourceDir, absoluteSourceDir, modules, extensions, excludeDirs);

    // Step 2: Detect circular dependencies
    const cycles = detectCycles(modules);

    // Step 3: Calculate statistics
    const dependencyCount = Array.from(modules.values())
        .reduce((sum, mod) => sum + mod.dependencies.length, 0);

    return {
        modules,
        cycles,
        moduleCount: modules.size,
        dependencyCount
    };
}

/**
 * Recursively collects all modules and their dependencies
 */
function collectModules(
    currentDir: string,
    sourceRoot: string,
    modules: Map<string, Module>,
    extensions: string[],
    excludeDirs: string[]
): void {
    if (!fs.existsSync(currentDir)) {
        return;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        if (entry.isDirectory()) {
            // Skip excluded directories
            if (excludeDirs.includes(entry.name)) {
                continue;
            }
            // Recursively process subdirectories
            collectModules(fullPath, sourceRoot, modules, extensions, excludeDirs);
        } else if (entry.isFile()) {
            // Process TypeScript files
            const ext = path.extname(entry.name);
            if (extensions.includes(ext)) {
                const relativePath = path.relative(sourceRoot, fullPath);
                const dependencies = extractImports(fullPath, sourceRoot);
                
                modules.set(relativePath, {
                    filePath: fullPath,
                    relativePath,
                    dependencies
                });
            }
        }
    }
}

/**
 * Extracts import statements from a TypeScript file
 * 
 * @param filePath - Absolute path to the file
 * @param sourceRoot - Source root directory
 * @returns Array of relative paths to imported modules
 */
function extractImports(filePath: string, sourceRoot: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports: string[] = [];

    // Regular expressions to match import statements
    const importPatterns = [
        // import ... from '...'
        /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g,
        // require('...')
        /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        // import('...')
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
    ];

    for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const importPath = match[1];
            
            // Only process relative imports (internal modules)
            if (importPath.startsWith('.')) {
                const resolvedPath = resolveImportPath(filePath, importPath, sourceRoot);
                if (resolvedPath) {
                    imports.push(resolvedPath);
                }
            }
        }
    }

    return imports;
}

/**
 * Resolves a relative import path to an absolute module path
 * 
 * @param fromFile - The file containing the import
 * @param importPath - The relative import path
 * @param sourceRoot - Source root directory
 * @returns Relative path from source root, or null if not found
 */
function resolveImportPath(
    fromFile: string,
    importPath: string,
    sourceRoot: string
): string | null {
    const fromDir = path.dirname(fromFile);
    const absoluteImport = path.resolve(fromDir, importPath);

    // Try different extensions
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    // Try as file
    for (const ext of extensions) {
        const withExt = absoluteImport + ext;
        if (fs.existsSync(withExt)) {
            return path.relative(sourceRoot, withExt);
        }
    }

    // Try as directory with index file
    for (const ext of extensions) {
        const indexPath = path.join(absoluteImport, `index${ext}`);
        if (fs.existsSync(indexPath)) {
            return path.relative(sourceRoot, indexPath);
        }
    }

    // If we can't resolve it, return null
    return null;
}

/**
 * Detects circular dependencies using depth-first search
 * 
 * @param modules - Map of all modules
 * @returns Array of detected cycles
 */
function detectCycles(modules: Map<string, Module>): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    for (const modulePath of modules.keys()) {
        if (!visited.has(modulePath)) {
            detectCyclesHelper(
                modulePath,
                modules,
                visited,
                recursionStack,
                pathStack,
                cycles
            );
        }
    }

    return cycles;
}

/**
 * Helper function for cycle detection using DFS
 */
function detectCyclesHelper(
    currentModule: string,
    modules: Map<string, Module>,
    visited: Set<string>,
    recursionStack: Set<string>,
    pathStack: string[],
    cycles: DependencyCycle[]
): void {
    visited.add(currentModule);
    recursionStack.add(currentModule);
    pathStack.push(currentModule);

    const module = modules.get(currentModule);
    if (!module) {
        pathStack.pop();
        recursionStack.delete(currentModule);
        return;
    }

    for (const dependency of module.dependencies) {
        if (!modules.has(dependency)) {
            // Dependency not in our module set (external or unresolved)
            continue;
        }

        if (!visited.has(dependency)) {
            // Visit unvisited dependency
            detectCyclesHelper(
                dependency,
                modules,
                visited,
                recursionStack,
                pathStack,
                cycles
            );
        } else if (recursionStack.has(dependency)) {
            // Found a cycle!
            const cycleStartIndex = pathStack.indexOf(dependency);
            const cycle = pathStack.slice(cycleStartIndex);
            cycle.push(dependency); // Complete the cycle

            // Create a description
            const description = cycle.join(' -> ');

            // Check if we've already found this cycle (or its reverse)
            const isDuplicate = cycles.some(existingCycle => {
                return arraysEqual(existingCycle.cycle, cycle) ||
                       arraysEqual(existingCycle.cycle, cycle.slice().reverse());
            });

            if (!isDuplicate) {
                cycles.push({ cycle, description });
            }
        }
    }

    pathStack.pop();
    recursionStack.delete(currentModule);
}

/**
 * Checks if two arrays are equal
 */
function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }
    return true;
}

/**
 * Gets the layer of a module based on its path
 * 
 * Layers (from low to high):
 * - types: Type definitions
 * - infrastructure: Cross-cutting concerns
 * - services: Business logic
 * - commands: Command implementations
 * - ui: UI components
 * - extension: Entry point
 * 
 * @param modulePath - Relative module path
 * @returns The layer name
 */
export function getModuleLayer(modulePath: string): string {
    const normalized = modulePath.replace(/\\/g, '/');
    
    // Check for specific patterns (order matters - more specific first)
    if (normalized.includes('types/') || normalized.startsWith('types\\')) return 'types';
    if (normalized.includes('infrastructure/') || normalized.startsWith('infrastructure\\')) return 'infrastructure';
    if (normalized.includes('services/') || normalized.startsWith('services\\')) return 'services';
    if (normalized.includes('commands/') || normalized.startsWith('commands\\')) return 'commands';
    if (normalized.includes('ui/') || normalized.startsWith('ui\\')) return 'ui';
    if (normalized.includes('utils/') || normalized.startsWith('utils\\')) return 'utils';
    if (normalized.includes('languages/') || normalized.startsWith('languages\\')) return 'languages';
    if (normalized.includes('constants/') || normalized.startsWith('constants\\')) return 'constants';
    if (normalized.includes('extension.ts') || normalized === 'extension.ts') return 'extension';
    
    return 'other';
}

/**
 * Validates that module dependencies respect layer boundaries
 * 
 * Higher layers can depend on lower layers, but not vice versa.
 * Layer hierarchy (low to high):
 * types < constants < languages < utils < infrastructure < services < commands < ui < extension
 * 
 * Note: utils is a shared utility layer that can be used by infrastructure and above
 * 
 * @param modules - Map of all modules
 * @returns Array of layer boundary violations
 */
export function validateLayerBoundaries(
    modules: Map<string, Module>
): Array<{ from: string; to: string; violation: string }> {
    const violations: Array<{ from: string; to: string; violation: string }> = [];
    
    const layerOrder = [
        'types',
        'constants',
        'languages',
        'utils',
        'infrastructure',
        'services',
        'commands',
        'ui',
        'extension'
    ];

    for (const [modulePath, module] of modules) {
        const fromLayer = getModuleLayer(modulePath);
        const fromLayerIndex = layerOrder.indexOf(fromLayer);

        for (const dependency of module.dependencies) {
            const toLayer = getModuleLayer(dependency);
            const toLayerIndex = layerOrder.indexOf(toLayer);

            // Check if dependency violates layer hierarchy
            if (fromLayerIndex !== -1 && toLayerIndex !== -1 && fromLayerIndex < toLayerIndex) {
                violations.push({
                    from: modulePath,
                    to: dependency,
                    violation: `Layer '${fromLayer}' should not depend on higher layer '${toLayer}'`
                });
            }
        }
    }

    return violations;
}

/**
 * Gets statistics about the dependency graph
 * 
 * @param modules - Map of all modules
 * @returns Statistics object
 */
export function getDependencyStatistics(modules: Map<string, Module>): {
    totalModules: number;
    totalDependencies: number;
    averageDependencies: number;
    maxDependencies: number;
    moduleWithMostDependencies: string | null;
    modulesByLayer: Record<string, number>;
} {
    let totalDependencies = 0;
    let maxDependencies = 0;
    let moduleWithMostDependencies: string | null = null;
    const modulesByLayer: Record<string, number> = {};

    for (const [modulePath, module] of modules) {
        const depCount = module.dependencies.length;
        totalDependencies += depCount;

        if (depCount > maxDependencies) {
            maxDependencies = depCount;
            moduleWithMostDependencies = modulePath;
        }

        const layer = getModuleLayer(modulePath);
        modulesByLayer[layer] = (modulesByLayer[layer] || 0) + 1;
    }

    return {
        totalModules: modules.size,
        totalDependencies,
        averageDependencies: modules.size > 0 ? totalDependencies / modules.size : 0,
        maxDependencies,
        moduleWithMostDependencies,
        modulesByLayer
    };
}
