import { Module } from './dependency.types';

const LAYER_ORDER = [
    'types',
    'constants',
    'languages',
    'utils',
    'infrastructure',
    'services',
    'commands',
    'ui',
    'extension',
];

export function getModuleLayer(modulePath: string): string {
    const normalized = modulePath.replace(/\\/g, '/');

    if (normalized.includes('types/') || normalized.startsWith('types\\')) {
        return 'types';
    }
    if (normalized.includes('infrastructure/') || normalized.startsWith('infrastructure\\')) {
        return 'infrastructure';
    }
    if (normalized.includes('services/') || normalized.startsWith('services\\')) {
        return 'services';
    }
    if (normalized.includes('commands/') || normalized.startsWith('commands\\')) {
        return 'commands';
    }
    if (normalized.includes('ui/') || normalized.startsWith('ui\\')) {
        return 'ui';
    }
    if (normalized.includes('utils/') || normalized.startsWith('utils\\')) {
        return 'utils';
    }
    if (normalized.includes('languages/') || normalized.startsWith('languages\\')) {
        return 'languages';
    }
    if (normalized.includes('constants/') || normalized.startsWith('constants\\')) {
        return 'constants';
    }
    if (normalized.includes('extension.ts') || normalized === 'extension.ts') {
        return 'extension';
    }

    return 'other';
}

export function validateLayerBoundaries(
    modules: Map<string, Module>,
): Array<{ from: string; to: string; violation: string }> {
    const violations: Array<{ from: string; to: string; violation: string }> = [];

    for (const [modulePath, module] of modules) {
        const fromLayer = getModuleLayer(modulePath);
        const fromLayerIndex = LAYER_ORDER.indexOf(fromLayer);

        for (const dependency of module.dependencies) {
            const toLayer = getModuleLayer(dependency);
            const toLayerIndex = LAYER_ORDER.indexOf(toLayer);

            if (fromLayerIndex !== -1 && toLayerIndex !== -1 && fromLayerIndex < toLayerIndex) {
                violations.push({
                    from: modulePath,
                    to: dependency,
                    violation: `Layer '${fromLayer}' should not depend on higher layer '${toLayer}'`,
                });
            }
        }
    }

    return violations;
}
