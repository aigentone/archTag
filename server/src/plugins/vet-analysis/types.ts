// src/plugins/vet-analysis/types.ts
export interface VetSensorData {
    temperature: number;
    activity: 'sleeping' | 'active' | 'eating' | 'resting';
    location: string;
    timestamp: Date;
  }
  
  export interface HealthStatus {
    status: 'normal' | 'warning' | 'critical';
    temperature: number;
    activity: string;
    location: string;
    timestamp: Date;
    concerns: string[];
  }