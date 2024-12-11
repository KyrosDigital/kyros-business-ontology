import { cn } from './utils';

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
