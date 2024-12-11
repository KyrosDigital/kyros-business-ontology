import { PrismaClient } from '@prisma/client';
import { prisma } from './prisma-client';

describe('PrismaClient', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restore original NODE_ENV after each test
    process.env.NODE_ENV = originalEnv;
    // Clear the global prisma instance
    global.prisma = undefined;
  });

  test('creates a new PrismaClient instance', () => {
    expect(prisma).toBeInstanceOf(PrismaClient);
  });

  test('uses expected log levels', () => {
    // Access private property for testing configuration
    const client = prisma as any;
    expect(client._engineConfig.activeProvider).toBe('postgresql');
    expect(client._engineConfig.logLevels).toEqual(['warn', 'error']);
  });

  test('assigns prisma to global object in development', () => {
    process.env.NODE_ENV = 'development';
    // Re-import to trigger the global assignment
    jest.isolateModules(() => {
      require('./prisma-client');
      expect(global.prisma).toBeInstanceOf(PrismaClient);
    });
  });

  test('does not assign prisma to global object in production', () => {
    process.env.NODE_ENV = 'production';
    // Clear any existing global prisma
    global.prisma = undefined;
    
    // Re-import to check production behavior
    jest.isolateModules(() => {
      require('./prisma-client');
      expect(global.prisma).toBeUndefined();
    });
  });

  test('reuses existing global prisma instance in development', () => {
    process.env.NODE_ENV = 'development';
    
    // Create first instance
    const firstInstance = jest.isolateModules(() => {
      return require('./prisma-client').prisma;
    });

    // Get second instance
    const secondInstance = jest.isolateModules(() => {
      return require('./prisma-client').prisma;
    });

    // Should be the same instance
    expect(firstInstance).toBe(secondInstance);
  });
});
