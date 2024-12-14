// src/plugins/vet-analysis/evaluators/health-status.evaluator.ts
import { Evaluator, IAgentRuntime, Memory, State } from '@ai16z/eliza';
import { VetSensorProvider } from '../providers/vet-sensor.provider.js';
import { HealthStatus } from '../types.js';

export class HealthStatusEvaluator implements Evaluator {
  name = "HEALTH_STATUS";
  description = "Evaluates basic health status from sensor data";
  similes = [];
  examples = [];
  private catId: string;

  constructor(catId: string) {
    this.catId = catId;
  }

  async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    return message.content.catId === this.catId;
  }

  async handler(runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<HealthStatus | null> {
    const sensorProvider = new VetSensorProvider(this.catId);
    const sensorData = await sensorProvider.get(runtime, _message, _state);
    
    if (!sensorData) return null;

    const concerns: string[] = [];
    let status: 'normal' | 'warning' | 'critical' = 'normal';

    // Check temperature (normal range: 37.5-39.2°C)
    if (sensorData.temperature < 37.0 || sensorData.temperature > 39.7) {
      status = 'critical';
      concerns.push(`Critical temperature: ${sensorData.temperature}°C`);
    } else if (sensorData.temperature < 37.5 || sensorData.temperature > 39.2) {
      status = 'warning';
      concerns.push(`Abnormal temperature: ${sensorData.temperature}°C`);
    }

    // Check for concerning activity patterns
    if (sensorData.activity === 'sleeping' && sensorData.temperature > 39.0) {
      concerns.push('Elevated temperature while sleeping');
      status = status === 'normal' ? 'warning' : status;
    }

    return {
      status,
      temperature: sensorData.temperature,
      activity: sensorData.activity,
      location: sensorData.location,
      timestamp: sensorData.timestamp,
      concerns
    };
  }
}