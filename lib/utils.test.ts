import { cn, formatNodeType, hasChildren } from './utils';
import { NodeType } from '@/types/graph';

describe('cn (className merger)', () => {
  test('combines multiple class strings', () => {
    expect(cn('class1', 'class2')).toBe('class1 class2');
  });

  test('handles conditional classes with objects', () => {
    expect(cn(
      'base-class',
      {
        'conditional-true': true,
        'conditional-false': false,
      }
    )).toBe('base-class conditional-true');
  });

  test('handles undefined and null values', () => {
    expect(cn('base-class', undefined, null, 'valid-class'))
      .toBe('base-class valid-class');
  });

  test('merges tailwind classes correctly', () => {
    expect(cn(
      'px-2 py-1',
      'px-4' // should override px-2
    )).toBe('py-1 px-4');
  });

  test('handles complex tailwind merging scenarios', () => {
    expect(cn(
      'text-red-500 bg-blue-200 p-4',
      'hover:bg-blue-300',
      {
        'text-blue-500': true,  // should override text-red-500
        'p-6': true,            // should override p-4
      }
    )).toBe('bg-blue-200 hover:bg-blue-300 text-blue-500 p-6');
  });
});

describe('formatNodeType', () => {
  test('converts single word SNAKE_CASE to Title Case', () => {
    expect(formatNodeType(NodeType.ORGANIZATION)).toBe('Organization');
  });

  test('converts multiple word SNAKE_CASE to Title Case', () => {
    expect(formatNodeType(NodeType.DATA_SOURCE)).toBe('Data Source');
    expect(formatNodeType(NodeType.SOFTWARE_TOOL)).toBe('Software Tool');
  });

  test('converts three word SNAKE_CASE to Title Case', () => {
    expect(formatNodeType(NodeType.AI_COMPONENT)).toBe('Ai Component');
  });

  test('preserves existing casing after first letter', () => {
    // Testing with a custom NodeType value to verify behavior
    expect(formatNodeType('TEST_APIv2' as NodeType)).toBe('Test Apiv2');
  });
});

describe('hasChildren', () => {
  test('returns false for null node', () => {
    expect(hasChildren(null)).toBe(false);
  });

  test('returns false for node with undefined fromRelations', () => {
    const node = {
      id: '1',
      type: NodeType.ORGANIZATION,
      label: 'Test Node'
    };
    expect(hasChildren(node)).toBe(false);
  });

  test('returns false for node with empty fromRelations', () => {
    const node = {
      id: '1',
      type: NodeType.ORGANIZATION,
      label: 'Test Node',
      fromRelations: []
    };
    expect(hasChildren(node)).toBe(false);
  });

  test('returns true for node with fromRelations', () => {
    const node = {
      id: '1',
      type: NodeType.ORGANIZATION,
      label: 'Test Node',
      fromRelations: [
        {
          id: '2',
          from: '1',
          to: '3',
          type: 'has department'
        }
      ]
    };
    expect(hasChildren(node)).toBe(true);
  });
});
