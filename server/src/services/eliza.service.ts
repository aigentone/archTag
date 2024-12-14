import { BaseService } from "./base.service.js";
import {
  AgentRuntime,
  Character,
  defaultCharacter,
  ModelProviderName,
  elizaLogger,
  MemoryManager,
  Memory,
  getEmbeddingZeroVector,
  Content,
  State,
  composeContext,
  generateMessageResponse,
  ModelClass,
  stringToUuid,
  CacheManager,
  MemoryCacheAdapter
} from "@ai16z/eliza";
import { CatProfile } from "../types/cat.types.js";
import { SensorService } from "./sensor.service.js";
import { CatDatabaseService } from "./cat-database.service.js";
import { bootstrapPlugin } from "@ai16z/plugin-bootstrap";
import { createVetAnalysisPlugin, HealthStatus, VetSensorData } from '../plugins/vet-analysis/index.js';
import {  existsSync, promises as fs } from "fs";
import { resolve } from "path";
import { randomUUID } from "crypto";

// Configure Eliza logger
elizaLogger.closeByNewLine = false;
elizaLogger.verbose = true;

// Extend State interface with cat-specific properties
declare module '@ai16z/eliza' {
  interface State {
    healthStatus?: HealthStatus;
    currentSensorData?: VetSensorData;
    catProfile?: CatProfile;
  }
}

export class ElizaService extends BaseService {
  private static instance: ElizaService;
  private catRuntimes: Map<string, AgentRuntime> = new Map();
  private dbService: CatDatabaseService;
  private sensorService: SensorService;
  private readonly dataDir: string;

  private constructor() {
    super();
    this.dbService = CatDatabaseService.getInstance();
    this.sensorService = SensorService.getInstance();
    this.dataDir = resolve(process.cwd(), 'data/cats');
  }

  public static getInstance(): ElizaService {
    if (!ElizaService.instance) {
      ElizaService.instance = new ElizaService();
    }
    return ElizaService.instance;
  }

  private async loadCatCharacter(catId: string): Promise<Character> {
    try {
      const characterPath = resolve(this.dataDir, catId, 'character.json');
      
      if (existsSync(characterPath)) {
        const fileContent = await fs.readFile(characterPath, 'utf-8');
        const character = JSON.parse(fileContent);
        return {
          ...character,
          modelProvider: ModelProviderName.GROK,
          plugins: [], // Base plugins will be added in runtime creation
          templates: {
            messageHandlerTemplate: this.generateMessageTemplate()
          }
        };
      }
      
      console.warn(`No character file found for cat ${catId}, using default character`);
      return defaultCharacter;
    } catch (error) {
      console.error(`Error loading character for cat ${catId}:`, error);
      return defaultCharacter;
    }
  }

  private generateMessageTemplate(): string {
    return `
# Action Examples
{{actionExamples}}

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for {{agentName}}, a cat's AI persona.
About {{agentName}}:
{{bio}}
{{lore}}

# CAT HEALTH PROFILE:
Health Conditions: {{healthConditions}}
Current Medications: {{medications}}
Dietary Restrictions: {{dietaryRestrictions}}
Vaccination Status: {{vaccinationStatus}}
Weight: {{weight}}kg
Age: {{age}} years
Breed: {{breed}}

# CURRENT SENSOR DATA:
Temperature: {{temperature}}°C
Activity Level: {{activity}}
Location: {{location}}
Last Updated: {{timestamp}}

# Recent messages and context:
{{recentMessages}}

{{providers}}
{{attachments}}
{{actions}}

Current conversation:
{{formattedConversation}}

# Task: Generate a response that:
1. Acknowledges and incorporates both health profile and current sensor data naturally
2. Maintains {{agentName}}'s personality
3. Responds appropriately to the user's message
4. Includes relevant health information when appropriate
5. Shows awareness of any health conditions, medications, or dietary restrictions
6. Provides appropriate health insights based on sensor data and medical history

# IMPORTANT: Your response must be a valid JSON object with this structure:
{
  "user": "{{agentName}}",
  "text": "Your response message here",
  "action": "CONTINUE"
}`;
  }

  private async getCatRuntime(catId: string): Promise<AgentRuntime> {
    let runtime = this.catRuntimes.get(catId);
    
    if (!runtime) {
      const dbService = CatDatabaseService.getInstance();
      const character = await this.loadCatCharacter(catId);

      runtime = new AgentRuntime({
        databaseAdapter: dbService.getMainAdapter(),
        token: process.env.GROK_API_KEY || "",
        modelProvider: ModelProviderName.GROK,
        character,
        plugins: [
          bootstrapPlugin, 
          createVetAnalysisPlugin(catId)
        ],
        conversationLength: 32,
        cacheManager: new CacheManager(new MemoryCacheAdapter()),
        agentId: stringToUuid(catId)
      });

      await this.initializeCatMemoryManagers(runtime, catId);
      this.catRuntimes.set(catId, runtime);
    }
    
    return runtime;
  }

  private async initializeCatMemoryManagers(runtime: AgentRuntime, catId: string): Promise<void> {
    const memoryTables = {
      messages: `cat_${catId}_messages`,
      health: `cat_${catId}_health`,
      behavior: `cat_${catId}_behavior`,
      analysis: `cat_${catId}_analysis`
    };

    for (const [name, tableName] of Object.entries(memoryTables)) {
      const manager = new MemoryManager({
        tableName,
        runtime,
      });
      runtime.registerMemoryManager(manager);
      if (name === 'messages') {
        runtime.messageManager = manager;
      }
    }
  }
  public async handleChat(message: string, catId: string): Promise<string> {
    try {
        const runtime = await this.getCatRuntime(catId);
        const roomId = stringToUuid(catId);
        const userId = stringToUuid(randomUUID());

        // Get current sensor data and cat profile
        const [sensorData, profileRow] = await Promise.all([
            this.sensorService.getCurrentData(catId),
            this.dbService.getProfile(catId)
        ]);

        // Convert profile row to CatProfile format
        const catProfile = profileRow ? {
            id: profileRow.id,
            name: profileRow.name,
            breed: profileRow.breed || undefined,
            age: profileRow.age || undefined,
            personality: profileRow.personality || undefined,
            weight: profileRow.weight || undefined,
            healthConditions: profileRow.health_conditions ? JSON.parse(profileRow.health_conditions) : [],
            medications: profileRow.medications ? JSON.parse(profileRow.medications) : [],
            vaccinationStatus: profileRow.vaccination_status || undefined,
            dietaryRestrictions: profileRow.dietary_restrictions ? JSON.parse(profileRow.dietary_restrictions) : [],
            createdAt: new Date(profileRow.created_at),
            updatedAt: new Date(profileRow.updated_at)
        } : undefined;

        // Create memory with both sensor and profile data
        const memory: Memory = {
            id: stringToUuid(randomUUID()),
            agentId: runtime.agentId,
            userId,
            roomId,
            content: {
                text: message,
                source: "archietag",
                catId: catId,
                sensorData: sensorData || undefined,
                profile: catProfile || undefined
            },
            createdAt: Date.now(),
            embedding: getEmbeddingZeroVector(),
        };

        await runtime.messageManager.createMemory(memory);

        // Initialize and update state
        let state = await runtime.composeState(memory);
        state = await runtime.updateRecentMessageState(state);
        
        // Add sensor and profile data to state
        state = {
            ...state,
            currentSensorData: sensorData ?? undefined,
            catProfile: catProfile,
            catStatus: sensorData ? {
                temperature: sensorData.temperature,
                activity: sensorData.activity,
                location: sensorData.location,
                timestamp: sensorData.timestamp
            } : undefined
        };

        // Generate context
        const context = composeContext({
            state: {
                ...state,
                temperature: sensorData?.temperature.toFixed(1) || 'unknown',
                activity: sensorData?.activity || 'unknown',
                location: sensorData?.location || 'unknown',
                timestamp: sensorData?.timestamp 
                    ? new Date(sensorData.timestamp).toLocaleString()
                    : 'unknown',
                healthConditions: catProfile?.healthConditions?.join(', ') || 'None',
                medications: catProfile?.medications?.join(', ') || 'None',
                dietaryRestrictions: catProfile?.dietaryRestrictions?.join(', ') || 'None',
                vaccinationStatus: catProfile?.vaccinationStatus || 'Unknown',
                weight: catProfile?.weight?.toString() || 'Unknown',
                age: catProfile?.age?.toString() || 'Unknown',
                breed: catProfile?.breed || 'Unknown'
            },
            template: runtime.character.templates?.messageHandlerTemplate || this.generateMessageTemplate()
        });

        const responseContent = await this._generateResponse(memory, state, context, runtime);
        if (!responseContent || !responseContent.text) {
            return "I'm having trouble processing your message right now. Can you try again?";
        }

        // Store response
        const responseMemory: Memory = {
            id: stringToUuid(randomUUID()),
            agentId: runtime.agentId,
            userId,
            roomId,
            content: {
                ...responseContent,
                sensorData: sensorData || undefined,
                profile: catProfile || undefined
            },
            createdAt: Date.now(),
            embedding: getEmbeddingZeroVector(),
        };

        await runtime.messageManager.createMemory(responseMemory);
        return responseContent.text;
    } catch (error) {
        console.error("Error processing message:", error);
        return "I apologize, but I'm experiencing some technical difficulties. Please try again in a moment.";
    }
}

  public async saveCatCharacter(catId: string, character: Character): Promise<void> {
    const characterDir = resolve(this.dataDir, catId);
    const characterPath = resolve(characterDir, 'character.json');

    await fs.mkdir(characterDir, { recursive: true });
    await fs.writeFile(characterPath, JSON.stringify(character, null, 2));

    // Clear existing runtime to force reload with new character
    const runtime = this.catRuntimes.get(catId);
    if (runtime) {
      await runtime.databaseAdapter.close();
      this.catRuntimes.delete(catId);
    }
  }

  public async getCatCharacter(catId: string): Promise<Character> {
    return this.loadCatCharacter(catId);
  }

  private async _generateResponse(
    message: Memory,
    _state: State,
    context: string,
    runtime: AgentRuntime
  ): Promise<Content | null> {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      try {
        const response = await generateMessageResponse({
          runtime,
          context,
          modelClass: ModelClass.LARGE,
        });

        if (!response || !response.text || typeof response.text !== 'string') {
          throw new Error("Invalid response format");
        }

        await runtime.databaseAdapter.log({
          body: { message, context, response },
          userId: message.userId,
          roomId: message.roomId,
          type: "response",
        });

        return response;
      } catch (error) {
        attempts++;
        if (attempts === maxRetries) {
          return {
            text: "I apologize, but I'm having trouble formulating a response right now. Could you please try rephrasing your message?",
            action: "CONTINUE",
          };
        }
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }
    return null;
  }

  public async start(): Promise<void> {
    try {
      await Promise.all([
        this.dbService.start(),
        this.sensorService.start()
      ]);
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log("Eliza service started successfully");
    } catch (error) {
      console.error("Failed to start Eliza service:", error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    try {
      for (const runtime of this.catRuntimes.values()) {
        await runtime.databaseAdapter.close();
      }
      this.catRuntimes.clear();
      
      await Promise.all([
        this.dbService.stop(),
        this.sensorService.stop()
      ]);
      
      console.log("Eliza service stopped successfully");
    } catch (error) {
      console.error("Error stopping Eliza service:", error);
      throw error;
    }
  }
}