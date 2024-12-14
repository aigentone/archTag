// src/plugins/vet-analysis/providers/vet-sensor.provider.ts
import { Provider, IAgentRuntime, Memory, State } from '@ai16z/eliza';
import { SensorService } from '../../../services/sensor.service.js';
import { VetSensorData } from '../types.js';

export class VetSensorProvider implements Provider {
  name = "VET_SENSOR";
  private catId: string;
  private sensorService: SensorService;

  constructor(catId: string) {
    this.catId = catId;
    this.sensorService = SensorService.getInstance();
  }

  async get(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<VetSensorData | null> {
    try {
      return await this.sensorService.getCurrentData(this.catId);
    } catch (error) {
      console.error("Error in VetSensorProvider:", error);
      return null;
    }
  }
}