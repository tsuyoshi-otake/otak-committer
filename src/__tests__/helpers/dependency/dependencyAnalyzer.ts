import * as path from 'path';
import { collectModules } from './dependency.collect';
import { detectCycles } from './dependency.cycles';
import { getModuleLayer, validateLayerBoundaries } from './dependency.layers';
import { getDependencyStatistics } from './dependency.stats';
import { DependencyAnalysisResult, DependencyCycle, Module } from './dependency.types';

export type { Module, DependencyCycle, DependencyAnalysisResult };
export { getModuleLayer, validateLayerBoundaries, getDependencyStatistics };

export function analyzeModuleDependencies(
    sourceDir: string,
    options: {
        extensions?: string[];
        excludeDirs?: string[];
    } = {},
): DependencyAnalysisResult {
    const {
        extensions = ['.ts', '.tsx'],
        excludeDirs = ['node_modules', 'out', 'dist', '__tests__', '.vscode-test'],
    } = options;

    const modules = new Map<string, Module>();
    const absoluteSourceDir = path.resolve(sourceDir);

    collectModules(absoluteSourceDir, absoluteSourceDir, modules, extensions, excludeDirs);
    const cycles: DependencyCycle[] = detectCycles(modules);
    const dependencyCount = Array.from(modules.values()).reduce(
        (sum, mod) => sum + mod.dependencies.length,
        0,
    );

    return {
        modules,
        cycles,
        moduleCount: modules.size,
        dependencyCount,
    };
}
