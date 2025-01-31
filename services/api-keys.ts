import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/prisma/prisma-client';
import type { ApiKey } from '@prisma/client';

class ApiKeyService {
  private generateSecureKey(): string {
    // Generate a more secure key by combining multiple UUIDs
    const key1 = uuidv4().replace(/-/g, '');
    const key2 = uuidv4().replace(/-/g, '');
    return `pk_${key1}${key2}`;
  }

  async create({
    name,
    organizationId,
    userId,
    clerkId,
    expiresAt
  }: {
    name: string;
    organizationId: string;
    userId: string;
    clerkId: string;
    expiresAt?: Date;
  }): Promise<ApiKey> {
    return prisma.apiKey.create({
      data: {
        key: this.generateSecureKey(),
        name,
        organizationId,
        userId,
        clerkId,
        expiresAt,
        isEnabled: true
      }
    });
  }

  async validate(key: string): Promise<ApiKey | null> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { key }
    });

    if (!apiKey) return null;

    // Check if key is enabled and not expired
    if (!apiKey.isEnabled) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() }
    });

    return apiKey;
  }

  async disable(id: string): Promise<ApiKey> {
    return prisma.apiKey.update({
      where: { id },
      data: { isEnabled: false }
    });
  }

  async delete(id: string): Promise<ApiKey> {
    return prisma.apiKey.delete({
      where: { id }
    });
  }

  async getOrganizationKeys(organizationId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: { organizationId }
    });
  }

  async getUserKeys(userId: string): Promise<ApiKey[]> {
    return prisma.apiKey.findMany({
      where: { createdById: userId }
    });
  }
}

export const apiKeyService = new ApiKeyService();
