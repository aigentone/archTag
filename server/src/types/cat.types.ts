export interface CatProfile {
    id: string;
    name: string;
    breed?: string;
    age?: number;
    personality?: string;
    weight?: number;
    healthConditions?: string[];
    medications?: string[];
    vaccinationStatus?: string;
    dietaryRestrictions?: string[];
    createdAt: Date;
    updatedAt: Date;
  }