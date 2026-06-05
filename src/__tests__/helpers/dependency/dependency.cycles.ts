import { DependencyCycle, Module } from './dependency.types';

export function detectCycles(modules: Map<string, Module>): DependencyCycle[] {
    const cycles: DependencyCycle[] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const pathStack: string[] = [];

    for (const modulePath of modules.keys()) {
        if (!visited.has(modulePath)) {
            detectCyclesHelper(modulePath, modules, visited, recursionStack, pathStack, cycles);
        }
    }

    return cycles;
}

function detectCyclesHelper(
    currentModule: string,
    modules: Map<string, Module>,
    visited: Set<string>,
    recursionStack: Set<string>,
    pathStack: string[],
    cycles: DependencyCycle[],
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
            continue;
        }

        if (!visited.has(dependency)) {
            detectCyclesHelper(dependency, modules, visited, recursionStack, pathStack, cycles);
        } else if (recursionStack.has(dependency)) {
            const cycleStartIndex = pathStack.indexOf(dependency);
            const cycle = pathStack.slice(cycleStartIndex);
            cycle.push(dependency);
            const description = cycle.join(' -> ');

            const isDuplicate = cycles.some(
                (existingCycle) =>
                    arraysEqual(existingCycle.cycle, cycle) ||
                    arraysEqual(existingCycle.cycle, cycle.slice().reverse()),
            );

            if (!isDuplicate) {
                cycles.push({ cycle, description });
            }
        }
    }

    pathStack.pop();
    recursionStack.delete(currentModule);
}

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
