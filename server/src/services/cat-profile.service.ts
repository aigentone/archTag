import { BaseService } from "./base.service.js";
import { CatProfile } from "../types/cat.types.js";
import { randomUUID } from "crypto";
import { SensorService } from "./sensor.service.js";
import path from 'path';
import fs from "fs/promises";
import { CatDatabaseService, CatProfileRow } from "./cat-database.service.js";
import { UUID, stringToUuid, ModelProviderName } from "@ai16z/eliza";
import type { Character } from "@ai16z/eliza";

export class CatProfileService extends BaseService {
  private static instance: CatProfileService;
  private dbService: CatDatabaseService;
  private sensorService: SensorService;
  private readonly dataDir: string;

  private constructor() {
    super();
    this.dbService = CatDatabaseService.getInstance();
    this.sensorService = SensorService.getInstance();
    this.dataDir = path.join(process.cwd(), 'data/cats');
  }

  public static getInstance(): CatProfileService {
    if (!CatProfileService.instance) {
      CatProfileService.instance = new CatProfileService();
    }
    return CatProfileService.instance;
  }

  private async generateCharacter(profile: CatProfile): Promise<Character> {
    // Build health context array, filtering out any undefined/nulls
    const healthContext = [
      profile.breed ? `${profile.breed} cat` : null,
      profile.age ? `${profile.age} years old` : null,
      profile.weight ? `weighing ${profile.weight}kg` : null,
      profile.healthConditions?.length ? `with health conditions: ${profile.healthConditions.join(', ')}` : null,
      profile.medications?.length ? `on medications: ${profile.medications.join(', ')}` : null,
      profile.dietaryRestrictions?.length ? `with dietary restrictions: ${profile.dietaryRestrictions.join(', ')}` : null
    ].filter((item): item is string => item !== null);

    return {
      name: profile.name,
      modelProvider: ModelProviderName.GROK,
      bio: [
        `I'm ${profile.name}${healthContext.length ? ', ' + healthContext.join(', ') : ''}`,
        "I use advanced sensors to monitor my health and activities",
        profile.personality ? `My personality is ${profile.personality}` : "I have my own unique personality"
      ],
      lore: [
        "I'm a health-conscious cat with real-time monitoring",
        "I understand my health needs and care requirements",
        "I can detect and alert about health concerns"
      ],
      knowledge: [
        "Expert in feline health monitoring",
        "Understanding of normal vital signs",
        "Familiar with health alerts and warnings",
        ...healthContext
      ],
      style: {
        all: ["health-aware", "caring", "attentive"],
        chat: [
          "monitors health metrics",
          "shares wellness updates",
          "alerts to changes"
        ],
        post: ["reports status", "tracks health"]
      },
      clients: [],
      plugins: [],
      adjectives: ["health-conscious", "attentive", "caring"],
      messageExamples: [
        [
          {
            user: "{{user1}}",
            content: { text: "How are you feeling?" }
          },
          {
            user: profile.name,
            content: { text: "My sensors show that I'm doing well! My temperature and activity levels are normal." }
          }
        ]
      ],
      postExamples: [
        "Daily health check completed: all vitals normal",
        "Just finished my wellness monitoring"
      ],
      topics: ["cat health", "vital signs", "wellness monitoring"]
    };
  }

  private async saveCharacter(catId: string | UUID, character: Character): Promise<void> {
    const characterPath = path.join(this.dataDir, catId.toString(), 'character.json');
    await fs.mkdir(path.dirname(characterPath), { recursive: true });
    await fs.writeFile(characterPath, JSON.stringify(character, null, 2));
}

  private convertProfileToRow(profile: CatProfile): Omit<CatProfileRow, 'created_at' | 'updated_at'> {
    return {
      id: profile.id,
      name: profile.name,
      breed: profile.breed || null,
      age: profile.age || null,
      personality: profile.personality || null,
      weight: profile.weight || null,
      health_conditions: profile.healthConditions ? JSON.stringify(profile.healthConditions) : null,
      medications: profile.medications ? JSON.stringify(profile.medications) : null,
      vaccination_status: profile.vaccinationStatus || null,
      dietary_restrictions: profile.dietaryRestrictions ? JSON.stringify(profile.dietaryRestrictions) : null
    };
  }

  private convertRowToProfile(row: CatProfileRow): CatProfile {
    return {
      id: row.id,
      name: row.name,
      breed: row.breed || undefined,
      age: row.age || undefined,
      personality: row.personality || undefined,
      weight: row.weight || undefined,
      healthConditions: row.health_conditions ? JSON.parse(row.health_conditions) : [],
      medications: row.medications ? JSON.parse(row.medications) : [],
      vaccinationStatus: row.vaccination_status || undefined,
      dietaryRestrictions: row.dietary_restrictions ? JSON.parse(row.dietary_restrictions) : [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  public async createProfile(profileData: Omit<CatProfile, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = randomUUID();
    
    const profile: CatProfile = {
      id,
      ...profileData,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    try {
      // Save profile to database
      const profileRow = this.convertProfileToRow(profile);
      await this.dbService.createProfile(profileRow);

      // Generate and save character
      const character = await this.generateCharacter(profile);
      await this.saveCharacter(stringToUuid(id), character);

      // Start sensor monitoring
      await this.sensorService.startMonitoring(id);

      console.log(`Created profile and character for cat: ${profile.name}`);
      return id;
    } catch (error) {
      console.error('Error creating cat profile:', error);
      throw error;
    }
  }

  public async getProfile(id: string): Promise<CatProfile | null> {
    try {
      const profileRow = await this.dbService.getProfile(id);
      return profileRow ? this.convertRowToProfile(profileRow) : null;
    } catch (error) {
      console.error(`Error getting profile for cat ${id}:`, error);
      return null;
    }
  }

  public async updateProfile(id: string, updates: Partial<CatProfile>): Promise<CatProfile | null> {
    try {
      const existingProfile = await this.getProfile(id);
      if (!existingProfile) return null;

      const updatedProfile: CatProfile = {
        ...existingProfile,
        ...updates,
        id,
        updatedAt: new Date()
      };

      // Update profile in database
      const profileRow = this.convertProfileToRow(updatedProfile);
      await this.dbService.updateProfile(profileRow);

      // Update character
      const character = await this.generateCharacter(updatedProfile);
      await this.saveCharacter(stringToUuid(id), character);

      return updatedProfile;
    } catch (error) {
      console.error(`Error updating profile for cat ${id}:`, error);
      return null;
    }
  }

  public async deleteProfile(id: string): Promise<boolean> {
    try {
      // Stop sensor monitoring
      await this.sensorService.stopMonitoring(id);

      // Remove from database
      await this.dbService.deleteProfile(id);

      // Remove cat directory with all files
      const catDir = path.join(this.dataDir, id);
      await fs.rm(catDir, { recursive: true, force: true });

      return true;
    } catch (error) {
      console.error(`Error deleting profile for cat ${id}:`, error);
      return false;
    }
  }

  public async listProfiles(): Promise<CatProfile[]> {
    try {
      const profileRows = await this.dbService.listProfiles();
      return profileRows.map(row => this.convertRowToProfile(row));
    } catch (error) {
      console.error('Error listing profiles:', error);
      return [];
    }
  }

  public async start(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });
    console.log("Cat Profile Service started");
  }

  public async stop(): Promise<void> {
    console.log("Cat Profile Service stopped");
  }
}