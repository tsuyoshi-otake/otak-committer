export interface Module {
    filePath: string;
    relativePath: string;
    dependencies: string[];
}

export interface DependencyCycle {
    cycle: string[];
    description: string;
}

export interface DependencyAnalysisResult {
    modules: Map<string, Module>;
    cycles: DependencyCycle[];
    moduleCount: number;
    dependencyCount: number;
}
