import { SqliteDatabaseAdapter } from "@ai16z/adapter-sqlite";
import { BaseService } from "./base.service.js";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs/promises";
import { UUID, stringToUuid, Memory } from "@ai16z/eliza";

export interface CatProfileRow {
  id: string;
  name: string;
  breed: string | null;
  age: number | null;
  personality: string | null;
  weight: number | null;
  health_conditions: string | null;
  medications: string | null;
  vaccination_status: string | null;
  dietary_restrictions: string | null;
  created_at: string;
  updated_at: string;
}

const CAT_PROFILE_SCHEMA = `
CREATE TABLE IF NOT EXISTS cat_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  breed TEXT,
  age INTEGER,
  personality TEXT,
  weight REAL,
  health_conditions TEXT,
  medications TEXT,
  vaccination_status TEXT,
  dietary_restrictions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

export class CatDatabaseService extends BaseService {
  private static instance: CatDatabaseService;
  private mainDb: SqliteDatabaseAdapter | null = null;
  private readonly dataDir: string;
  private readonly mainDbPath: string;

  private constructor() {
    super();
    this.dataDir = path.join(process.cwd(), 'data/cats');
    this.mainDbPath = path.join(this.dataDir, 'main.sqlite');
  }

  private ensureUUID(id: string | UUID): UUID {
    return typeof id === 'string' ? stringToUuid(id) : id;
  }

  public static getInstance(): CatDatabaseService {
    if (!CatDatabaseService.instance) {
      CatDatabaseService.instance = new CatDatabaseService();
    }
    return CatDatabaseService.instance;
  }
  public getMainAdapter(): SqliteDatabaseAdapter {
    if (!this.mainDb) {
        throw new Error("Database not initialized");
    }
    return this.mainDb;
}

  private async initializeMainDb(): Promise<void> {
    if (this.mainDb) return;

    await fs.mkdir(path.dirname(this.mainDbPath), { recursive: true });
    const db = new Database(this.mainDbPath);
    this.mainDb = new SqliteDatabaseAdapter(db);
    
    // Initialize Eliza schema
    await this.mainDb.init();
    
    // Initialize cat profiles schema
    db.exec(CAT_PROFILE_SCHEMA);

    console.log("Main database initialized at:", this.mainDbPath);
  }

  async createProfile(profile: Omit<CatProfileRow, 'created_at' | 'updated_at'>): Promise<void> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");

    const sql = `
      INSERT INTO cat_profiles (
        id, name, breed, age, personality, weight,
        health_conditions, medications, vaccination_status,
        dietary_restrictions, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `;

    try {
      this.mainDb.db.prepare(sql).run(
        profile.id,
        profile.name,
        profile.breed,
        profile.age,
        profile.personality,
        profile.weight,
        profile.health_conditions,
        profile.medications,
        profile.vaccination_status,
        profile.dietary_restrictions
      );
      console.log(`Profile created for cat: ${profile.name}`);
    } catch (error) {
      console.error("Error creating profile:", error);
      throw error;
    }
  }

  async getProfile(catId: string): Promise<CatProfileRow | null> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");

    try {
      const sql = "SELECT * FROM cat_profiles WHERE id = ?";
      const profile = this.mainDb.db.prepare(sql).get(catId) as CatProfileRow | undefined;
      return profile || null;
    } catch (error) {
      console.error(`Error getting profile for cat ${catId}:`, error);
      return null;
    }
  }

  async updateProfile(profile: Partial<CatProfileRow> & { id: string }): Promise<void> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");

    const updates = Object.entries(profile)
      .filter(([key]) => key !== 'id' && key !== 'created_at')
      .map(([key]) => `${key} = @${key}`);

    const sql = `
      UPDATE cat_profiles 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = @id
    `;

    try {
      this.mainDb.db.prepare(sql).run(profile);
      console.log(`Profile updated for cat: ${profile.id}`);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  async listProfiles(): Promise<CatProfileRow[]> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");

    try {
      const sql = "SELECT * FROM cat_profiles ORDER BY created_at DESC";
      return this.mainDb.db.prepare(sql).all() as CatProfileRow[];
    } catch (error) {
      console.error("Error listing profiles:", error);
      return [];
    }
  }

  async deleteProfile(catId: string): Promise<void> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");

    try {
      const sql = "DELETE FROM cat_profiles WHERE id = ?";
      this.mainDb.db.prepare(sql).run(catId);
      console.log(`Profile deleted for cat: ${catId}`);
    } catch (error) {
      console.error(`Error deleting profile for cat ${catId}:`, error);
      throw error;
    }
  }

  async saveChatMessage(catId: string | UUID, message: Memory): Promise<void> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");
    
    const uuid = this.ensureUUID(catId);
    const chatMessage: Memory = {
        ...message,
        roomId: uuid,
        agentId: uuid
    };
    
    await this.mainDb.createMemory(chatMessage, 'chat_messages');
}

  async getChatHistory(catId: UUID, limit: number = 50): Promise<Memory[]> {
    await this.initializeMainDb();
    if (!this.mainDb) throw new Error("Database not initialized");

    return this.mainDb.getMemories({
      tableName: 'chat_messages',
      roomId: stringToUuid(catId),
      agentId: stringToUuid(catId),
      count: limit
    });
  }

  async start(): Promise<void> {
    try {
      await this.initializeMainDb();
      console.log("CatDatabaseService started successfully");
    } catch (error) {
      console.error("Failed to start CatDatabaseService:", error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      if (this.mainDb) {
        await this.mainDb.close();
        this.mainDb = null;
      }
      console.log("CatDatabaseService stopped successfully");
    } catch (error) {
      console.error("Error stopping CatDatabaseService:", error);
      throw error;
    }
  }
}