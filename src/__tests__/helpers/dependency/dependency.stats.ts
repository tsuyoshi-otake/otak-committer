import { getModuleLayer } from './dependency.layers';
import { Module } from './dependency.types';

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
        modulesByLayer,
    };
}
