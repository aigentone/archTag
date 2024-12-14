import { BaseService } from "./base.service.js";
import { VetSensorData } from "../plugins/vet-analysis/types.js";
import { stringToUuid } from "@ai16z/eliza";
import { randomUUID } from "crypto";
import { CatDatabaseService } from "./cat-database.service.js";

export class SensorService extends BaseService {
  private static instance: SensorService;
  private sensorData: Map<string, VetSensorData> = new Map();
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): SensorService {
    if (!SensorService.instance) {
      SensorService.instance = new SensorService();
    }
    return SensorService.instance;
  }

  private generateMockData(): VetSensorData {
    // Fixed array of valid activities matching VetSensorData type
    const activities = ['sleeping', 'active', 'eating', 'resting'] as const;
    const locations = ['living room', 'bedroom', 'kitchen', 'bathroom', 'window'];

    // Generate temperature between 37-39°C with occasional outliers
    const baseTemp = 38;
    const variance = (Math.random() * 2 - 1); // -1 to +1
    const temperature = Math.round((baseTemp + variance * 0.5) * 10) / 10;

    return {
        temperature,
        activity: activities[Math.floor(Math.random() * activities.length)],
        location: locations[Math.floor(Math.random() * locations.length)],
        timestamp: new Date()
    };
}

  public async startMonitoring(catId: string): Promise<void> {
    // Generate initial data
    this.sensorData.set(catId, this.generateMockData());

    // Set up periodic updates (every 30 seconds)
    const interval = setInterval(() => {
      const lastData = this.sensorData.get(catId);
      if (lastData) {
        // Generate new data with some continuity from last reading
        const newData = this.generateMockData();
        // Smooth temperature changes
        newData.temperature = (lastData.temperature * 0.7 + newData.temperature * 0.3);
        newData.temperature = Math.round(newData.temperature * 10) / 10;
        
        this.sensorData.set(catId, newData);
      }
    }, 30000);

    this.updateIntervals.set(catId, interval);
    console.log(`Started monitoring cat: ${catId}`);
  }

  public async stopMonitoring(catId: string): Promise<void> {
    const interval = this.updateIntervals.get(catId);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(catId);
      this.sensorData.delete(catId);
      console.log(`Stopped monitoring cat: ${catId}`);
    }
  }
  public async saveSensorData(catId: string, data: VetSensorData): Promise<void> {
    const dbService = CatDatabaseService.getInstance();
    await dbService.saveChatMessage(stringToUuid(catId), {
        id: stringToUuid(randomUUID()),
        content: {
            type: 'sensor_data',
            text: `Sensor data: ${data.temperature}°C, ${data.activity}, ${data.location}`,
            ...data
        },
        userId: stringToUuid(catId),
        roomId: stringToUuid(catId),
        agentId: stringToUuid(catId),
        createdAt: Date.now()
    });
}

  public async getCurrentData(catId: string): Promise<VetSensorData | null> {
    let data = this.sensorData.get(catId);
    
    if (!data) {
      await this.startMonitoring(catId);
      data = this.sensorData.get(catId);
    }
    
    return data || null;
  }

  public async getRecentData(catId: string, minutes: number = 30): Promise<VetSensorData[]> {
    const currentData = await this.getCurrentData(catId);
    if (!currentData) return [];

    const data: VetSensorData[] = [];
    const now = new Date();
    const readings = Math.floor(minutes / 0.5); // One reading every 30 seconds

    for (let i = 0; i < readings; i++) {
      data.push({
        ...this.generateMockData(),
        timestamp: new Date(now.getTime() - (i * 30 * 1000))
      });
    }

    return data.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  public async start(): Promise<void> {
    console.log("Sensor Service started");
  }

  public async stop(): Promise<void> {
    for (const [catId, interval] of this.updateIntervals.entries()) {
      clearInterval(interval);
      console.log(`Stopped monitoring cat: ${catId}`);
    }
    this.updateIntervals.clear();
    this.sensorData.clear();
    console.log("Sensor Service stopped");
  }

  // Helper methods for specific health checks
  public async checkHealthStatus(catId: string): Promise<{
    isTemperatureNormal: boolean;
    temperature: number;
    activity: string;
  } | null> {
    const data = await this.getCurrentData(catId);
    if (!data) return null;

    return {
      isTemperatureNormal: data.temperature >= 37.5 && data.temperature <= 39.2,
      temperature: data.temperature,
      activity: data.activity
    };
  }
}