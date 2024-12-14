// src/plugins/vet-analysis/index.ts
import { Plugin } from '@ai16z/eliza';
import { VetSensorProvider } from './providers/vet-sensor.provider.js';
import { HealthStatusEvaluator } from './evaluators/health-status.evaluator.js';
import { HealthAlertAction } from './actions/health-alert.action.js';

export function createVetAnalysisPlugin(catId: string): Plugin {
  return {
    name: "vet-analysis",
    description: "Basic health monitoring plugin",
    
    providers: [
      new VetSensorProvider(catId)
    ],

    evaluators: [
      new HealthStatusEvaluator(catId)
    ],

    actions: [
      new HealthAlertAction(catId)
    ]
  };
}

export * from './types.js';