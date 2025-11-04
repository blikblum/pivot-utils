import { PivotData } from './utilities.ts'

const fixtureData = [
  ['name', 'gender', 'colour', 'birthday', 'trials', 'successes'],
  ['Nick', 'male', 'blue', '1982-11-07', 103, 12],
  ['Jane', 'female', 'red', '1982-11-08', 95, 25],
  ['John', 'male', 'blue', '1982-12-08', 112, 30],
  ['Carol', 'female', 'yellow', '1983-12-08', 102, 12],
]

describe('aggregators', () => {
  describe('Count', () => {
    it('should count number of records', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'Count',
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe(4)
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe(2)
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe(2)
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe(2)
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe(1)
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })

  describe('Sum', () => {
    it('should sum value of a field', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'Sum',
        vals: ['successes'],
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe(12 + 25 + 30 + 12)
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe(12 + 30)
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe(12 + 30)
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe(12 + 30)
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe(12)
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })

  describe('Count Unique Values', () => {
    it('should count number of unique values of a field', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'Count Unique Values',
        vals: ['successes'],
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe(3)
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe(2)
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe(2)
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe(2)
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe(1)
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })

  describe('List Unique Values', () => {
    it('should list unique values of a field', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'List Unique Values',
        vals: ['successes'],
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe('12, 25, 30')
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe('12, 30')
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe('12, 30')
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe('12, 30')
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe('12')
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })

  describe('Count as Fraction of Total', () => {
    it('should count as fraction of total', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'Count as Fraction of Total',
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe(1)
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe(0.5)
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe(0.5)
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe(0.5)
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe(0.25)
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })

  describe('Count as Fraction of Rows', () => {
    it('should count as fraction of row', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'Count as Fraction of Rows',
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe(1)
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe(1)
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe(0.5)
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe(1)
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe(1)
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })

  describe('Count as Fraction of Columns', () => {
    it('should count as fraction of columns', () => {
      const pd = new PivotData({
        data: fixtureData,
        aggregatorName: 'Count as Fraction of Columns',
        rows: ['colour'],
        cols: ['gender'],
      })
      // all
      expect(pd.getAggregator([], []).value()).toBe(1)
      // colour: blue
      expect(pd.getAggregator(['blue'], []).value()).toBe(0.5)
      // gender: male
      expect(pd.getAggregator([], ['male']).value()).toBe(1)
      // gender: male, colour: blue
      expect(pd.getAggregator(['blue'], ['male']).value()).toBe(1)
      // gender: colour: yellow, female
      expect(pd.getAggregator(['yellow'], ['female']).value()).toBe(0.5)
      // gender: colour: yellow, male
      expect(pd.getAggregator(['yellow'], ['male']).value()).toBe(null)
    })
  })
})
