import { normalizePoints, calculateNormalizationFactor, getTeamSizeStats, hasTeamSizeVariance } from '../normalization';

describe('Point Normalization', () => {
  describe('calculateNormalizationFactor', () => {
    it('returns 1 when team size equals max size', () => {
      expect(calculateNormalizationFactor(8, 8)).toBe(1);
    });
    it('returns correct factor for uneven teams', () => {
      expect(calculateNormalizationFactor(5, 8)).toBeCloseTo(1.6);
      expect(calculateNormalizationFactor(7, 8)).toBeCloseTo(1.143, 2);
    });
    it('handles zero team size', () => {
      expect(calculateNormalizationFactor(0, 8)).toBe(1);
    });
  });

  describe('normalizePoints - teams of 5, 7, and 8', () => {
    const MAX_TEAM_SIZE = 8;

    it('team of 8: points unchanged', () => {
      expect(normalizePoints(80, 8, MAX_TEAM_SIZE)).toBe(80);
    });
    it('team of 7: scaled up proportionally', () => {
      // 70 pts from 7 members -> per capita 10 -> normalised = 10 * 8 = 80
      expect(normalizePoints(70, 7, MAX_TEAM_SIZE)).toBe(80);
    });
    it('team of 5: scaled up proportionally', () => {
      // 50 pts from 5 members -> per capita 10 -> normalised = 10 * 8 = 80
      expect(normalizePoints(50, 5, MAX_TEAM_SIZE)).toBe(80);
    });
    it('equal per-capita effort -> equal normalised scores', () => {
      // All teams: 10 pts per member
      const team5 = normalizePoints(50, 5, MAX_TEAM_SIZE); // 80
      const team7 = normalizePoints(70, 7, MAX_TEAM_SIZE); // 80
      const team8 = normalizePoints(80, 8, MAX_TEAM_SIZE); // 80
      expect(team5).toBe(team7);
      expect(team7).toBe(team8);
    });
  });

  describe('hasTeamSizeVariance', () => {
    it('returns false for equal teams', () => {
      expect(hasTeamSizeVariance([
        { teamId: '1', teamName: 'A', memberCount: 8 },
        { teamId: '2', teamName: 'B', memberCount: 8 },
      ])).toBe(false);
    });
    it('returns true for uneven teams', () => {
      expect(hasTeamSizeVariance([
        { teamId: '1', teamName: 'A', memberCount: 5 },
        { teamId: '2', teamName: 'B', memberCount: 7 },
        { teamId: '3', teamName: 'C', memberCount: 8 },
      ])).toBe(true);
    });
  });

  describe('getTeamSizeStats', () => {
    it('returns correct stats for 5, 7, 8', () => {
      const stats = getTeamSizeStats([
        { teamId: '1', teamName: 'A', memberCount: 5 },
        { teamId: '2', teamName: 'B', memberCount: 7 },
        { teamId: '3', teamName: 'C', memberCount: 8 },
      ]);
      expect(stats.minSize).toBe(5);
      expect(stats.maxSize).toBe(8);
      expect(stats.avgSize).toBeCloseTo(6.67, 1);
      expect(stats.hasVariance).toBe(true);
    });
  });
});
