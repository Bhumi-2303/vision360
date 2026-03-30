import { describe, it, expect } from 'vitest';
import { inferType, sortScenes } from '../public/js/scene-helpers.js';

describe('scene-helpers', () => {
  describe('inferType', () => {
    it('returns provided explicit known type', () => {
      expect(inferType({ sceneType: 'classroom' })).toBe('classroom');
      expect(inferType({ sceneType: 'department' })).toBe('department');
    });

    it('infers building from title correctly', () => {
      expect(inferType({ title: 'Main Campus Gate' })).toBe('building');
    });

    it('infers department from title correctly', () => {
      expect(inferType({ title: 'Computer Science Dept' })).toBe('department');
    });

    it('infers lab from title correctly', () => {
      expect(inferType({ title: 'Physics Laboratory' })).toBe('lab');
    });

    it('infers classroom from title correctly', () => {
      expect(inferType({ title: 'Lecture Hall A' })).toBe('classroom');
    });

    it('defaults to building if nothing matches', () => {
      expect(inferType({ title: 'Unknown Place' })).toBe('building');
    });
  });

  describe('sortScenes', () => {
    it('sorts scenes primarily by type hierarchy and secondarily by title', () => {
      const unsorted = [
        { title: 'Z Lab', sceneType: 'lab' },
        { title: 'A Class', sceneType: 'classroom' },
        { title: 'Main Gate', sceneType: 'building' },
        { title: 'B Dept', sceneType: 'department' },
        { title: 'A Dept', sceneType: 'department' }
      ];

      const sorted = sortScenes(unsorted);
      expect(sorted[0].title).toBe('Main Gate'); // building
      expect(sorted[1].title).toBe('A Dept');    // department
      expect(sorted[2].title).toBe('B Dept');    // department
      expect(sorted[3].title).toBe('A Class');   // classroom
      expect(sorted[4].title).toBe('Z Lab');     // lab
    });
  });
});
