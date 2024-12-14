import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
//import { NgrokService } from "./services/ngrok.service.js";
import { ElizaService } from "./services/eliza.service.js";
import { CatProfileService } from "./services/cat-profile.service.js";
import { SensorService } from "./services/sensor.service.js";
import { IService } from "./services/base.service.js";
import { CatDatabaseService } from "./services/cat-database.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const services: IService[] = [];

// Load environment variables
dotenv.config({
  path: resolve(__dirname, "../../.env"),
});

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Core Services
const elizaService = ElizaService.getInstance();
const catProfileService = CatProfileService.getInstance();
const sensorService = SensorService.getInstance();

// Chat endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, catId } = req.body;
    const response = await elizaService.handleChat(message, catId);
    res.json({ response });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

// Cat profile endpoints
app.post("/api/cat/profile", async (req, res) => {
  try {
    const profile = req.body;
    const catId = await catProfileService.createProfile(profile);
    res.json({ catId });
  } catch (error) {
    console.error("Profile creation error:", error);
    res.status(500).json({ error: "Failed to create cat profile" });
  }
});


// In index.ts
app.get("/api/cats", async (_req, res) => {
  try {
    const catProfileService = CatProfileService.getInstance();
    const profiles = await catProfileService.listProfiles();
    res.json(profiles);
  } catch (error) {
    console.error("Failed to list cats:", error);
    res.status(500).json({ error: "Failed to fetch cat profiles" });
  }
});
app.get("/api/cat/profile/:catId", async (req, res) => {
  try {
    const { catId } = req.params;
    const profile = await catProfileService.getProfile(catId);
    res.json(profile);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch cat profile" });
  }
});

// Sensor data endpoint
app.get("/api/sensor/:catId", async (req, res) => {
  try {
    const { catId } = req.params;
    const sensorData = await sensorService.getCurrentData(catId);
    res.json(sensorData);
  } catch (error) {
    console.error("Sensor data error:", error);
    res.status(500).json({ error: "Failed to fetch sensor data" });
  }
});

app.get("/api/cat/profiles", async (_req, res) => {
  try {
    const catProfileService = CatProfileService.getInstance();
    const profiles = await catProfileService.listProfiles();
    console.log("Profiles:", profiles);
    res.json(profiles);
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ error: "Failed to fetch cat profiles" });
  }
});
// Start server
app.listen(port, async () => {
  try {
    console.log(`Server running on PORT: ${port}`);
    console.log("Server Environment:", process.env.NODE_ENV);

    // Start Ngrok
    //const ngrokService = NgrokService.getInstance();
    //await ngrokService.start();
    //services.push(ngrokService);
    //const ngrokUrl = ngrokService.getUrl()!;
    //console.log("NGROK URL:", ngrokUrl);

   
        const dbService = CatDatabaseService.getInstance();
        await dbService.start();
        services.push(dbService);

        await elizaService.start();
        services.push(elizaService);
        
        await catProfileService.start();
        services.push(catProfileService);
        
        await sensorService.start();
        services.push(sensorService);


  } catch (e) {
    console.error("Failed to start server:", e);
    process.exit(1);
  }
});

// Health check route
app.get("/health", async (_req, res) => {
  res.status(200).json({ 
    status: "healthy", 
    timestamp: new Date().toISOString() 
  });
});

// Graceful shutdown
async function gracefulShutdown() {
  console.log("Shutting down gracefully...");
  await Promise.all(services.map((service) => service.stop()));
  process.exit(0);
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

export default app;