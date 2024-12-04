export enum SubscriptionPlan {
  FREE_TRIAL = 'FREE_TRIAL',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export interface SubscriptionLimits {
  ontologies: number | null;
  nodesPerOntology: number | null;
  relationshipsPerOntology: number | null;
  aiPrompts: number | null;
}

export interface SubscriptionFeatures {
  customNodeTypes: boolean;
  advancedAI: boolean;
  export: boolean;
  prioritySupport: boolean;
}

// Type for the features JSON stored in the database
export interface SubscriptionFeatureFlags extends SubscriptionFeatures {
  _version: number; // For future schema migrations
}

// Constants for plan limits and features
export const PLAN_FEATURES: Record<SubscriptionPlan, SubscriptionFeatures> = {
  FREE_TRIAL: {
    customNodeTypes: false,
    advancedAI: false,
    export: false,
    prioritySupport: false,
  },
  PRO: {
    customNodeTypes: true,
    advancedAI: true,
    export: true,
    prioritySupport: true,
  },
  ENTERPRISE: {
    customNodeTypes: true,
    advancedAI: true,
    export: true,
    prioritySupport: true,
  },
};

export const PLAN_LIMITS: Record<SubscriptionPlan, SubscriptionLimits> = {
  FREE_TRIAL: {
    ontologies: 3,
    nodesPerOntology: 100,
    relationshipsPerOntology: 100,
    aiPrompts: 200,
  },
  PRO: {
    ontologies: 50,
    nodesPerOntology: 1000,
    relationshipsPerOntology: 2000,
    aiPrompts: null, // unlimited
  },
  ENTERPRISE: {
    ontologies: null, // unlimited
    nodesPerOntology: null, // unlimited
    relationshipsPerOntology: null, // unlimited
    aiPrompts: null, // unlimited
  },
}; 