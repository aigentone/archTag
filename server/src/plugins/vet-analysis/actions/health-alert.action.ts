// src/plugins/vet-analysis/actions/health-alert.action.ts
import { Action, IAgentRuntime, Memory, State } from '@ai16z/eliza';
import { HealthStatusEvaluator } from '../evaluators/health-status.evaluator.js';
import { HealthStatus } from '../types.js';

export class HealthAlertAction implements Action {
  name = "HEALTH_ALERT";
  description = "Handles health alerts based on sensor data";
  similes = [];
  examples = [];
  private catId: string;

  constructor(catId: string) {
    this.catId = catId;
  }

  async validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean> {
    if (message.content.catId !== this.catId) return false;

    const evaluator = new HealthStatusEvaluator(this.catId);
    const status = await evaluator.handler(_runtime, message);
    
    return status?.status === 'warning' || status?.status === 'critical';
  }

  async handler(runtime: IAgentRuntime, message: Memory, _state?: State): Promise<boolean> {
    try {
      const evaluator = new HealthStatusEvaluator(this.catId);
      const status = await evaluator.handler(runtime, message);
      
      if (!status) return false;

      // Create alert memory
      await runtime.messageManager.createMemory({
        id: crypto.randomUUID(),
        content: {
          text: this.generateAlertMessage(status),
          type: 'health_alert',
          status: status
        },
        agentId: runtime.agentId,
        userId: message.userId,
        roomId: message.roomId,
        createdAt: Date.now()
      });

      return true;
    } catch (error) {
      console.error('Error in HealthAlertAction:', error);
      return false;
    }
  }

  private generateAlertMessage(status: HealthStatus): string {
    const severity = status.status === 'critical' ? 'Critical' : 'Warning';
    return `${severity} Health Alert:\n${status.concerns.join('\n')}`;
  }
}