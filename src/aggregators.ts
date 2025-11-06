// Type definitions for aggregators
export type NumberFormatter = (x: number) => string

export interface NumberFormatOptions {
  digitsAfterDecimal?: number
  scaler?: number
  thousandsSep?: string
  decimalSep?: string
  prefix?: string
  suffix?: string
}

export interface Aggregator {
  push: (record: Record<string, any>) => void
  value: () => any
  format: (x: any) => string
  numInputs?: number
  [key: string]: any  // Allow additional properties for specific aggregator implementations
}

export type AggregatorGenerator = (data?: any, rowKey?: any[], colKey?: any[]) => Aggregator

export type AggregatorFunction = (vals: string[]) => AggregatorGenerator

export interface Aggregators {
  [key: string]: AggregatorFunction
}

// Helper function for number formatting
const addSeparators = function (nStr: string | number, thousandsSep: string, decimalSep: string): string {
  const x = String(nStr).split('.')
  let x1 = x[0]
  const x2 = x.length > 1 ? decimalSep + x[1] : ''
  const rgx = /(\d+)(\d{3})/
  while (rgx.test(x1)) {
    x1 = x1.replace(rgx, `$1${thousandsSep}$2`)
  }
  return x1 + x2
}

export const numberFormat = function (opts_in?: NumberFormatOptions): NumberFormatter {
  const defaults: Required<NumberFormatOptions> = {
    digitsAfterDecimal: 2,
    scaler: 1,
    thousandsSep: ',',
    decimalSep: '.',
    prefix: '',
    suffix: '',
  }
  const opts = Object.assign({}, defaults, opts_in)
  return function (x: number): string {
    if (isNaN(x) || !isFinite(x)) {
      return ''
    }
    const result = addSeparators(
      (opts.scaler * x).toFixed(opts.digitsAfterDecimal),
      opts.thousandsSep,
      opts.decimalSep
    )
    return `${opts.prefix}${result}${opts.suffix}`
  }
}

// Import types and functions needed for aggregators
import { getSort } from './utilities.ts'

// aggregator templates default to US number formatting but this is overrideable
const usFmt = numberFormat()
const usFmtInt = numberFormat({ digitsAfterDecimal: 0 })
const usFmtPct = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
})

export const aggregatorTemplates: any = {
  count(formatter: NumberFormatter = usFmtInt): AggregatorFunction {
    return () =>
      function (): Aggregator {
        return {
          count: 0,
          push() {
            this.count++
          },
          value() {
            return this.count
          },
          format: formatter,
        }
      }
  },

  uniques(fn: (arr: any[]) => any, formatter: NumberFormatter | ((x: any) => string) = usFmtInt): AggregatorFunction {
    return function ([attr]: string[]): AggregatorGenerator {
      return function (): Aggregator {
        return {
          uniq: [] as any[],
          push(record: Record<string, any>) {
            const x = record[attr]
            if (!this.uniq.includes(x)) {
              this.uniq.push(x)
            }
          },
          value() {
            return fn(this.uniq)
          },
          format: formatter,
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }
      }
    }
  },

  sum(formatter: NumberFormatter = usFmt): AggregatorFunction {
    return function ([attr]: string[]): AggregatorGenerator {
      return function (): Aggregator {
        return {
          sum: 0,
          push(record: Record<string, any>) {
            const x = parseFloat(record[attr])
            if (!isNaN(x)) {
              this.sum += x
            }
          },
          value() {
            return this.sum
          },
          format: formatter,
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }
      }
    }
  },

  extremes(mode: 'min' | 'max' | 'first' | 'last', formatter: NumberFormatter = usFmt): AggregatorFunction {
    return function ([attr]: string[]): AggregatorGenerator {
      return function (data?: any): Aggregator {
        return {
          val: null as any,
          sorter: getSort(typeof data !== 'undefined' ? data.props.sorters : null, attr),
          push(record: Record<string, any>) {
            let x = record[attr]
            if (['min', 'max'].includes(mode)) {
              x = parseFloat(x)
              if (!isNaN(x)) {
                this.val = Math[mode as 'min' | 'max'](x, this.val !== null ? this.val : x)
              }
            }
            if (mode === 'first' && this.sorter(x, this.val !== null ? this.val : x) <= 0) {
              this.val = x
            }
            if (mode === 'last' && this.sorter(x, this.val !== null ? this.val : x) >= 0) {
              this.val = x
            }
          },
          value() {
            return this.val
          },
          format(x: any) {
            if (isNaN(x)) {
              return x
            }
            return formatter(x)
          },
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }
      }
    }
  },

  quantile(q: number, formatter: NumberFormatter = usFmt): AggregatorFunction {
    return function ([attr]: string[]): AggregatorGenerator {
      return function (): Aggregator {
        return {
          vals: [] as number[],
          push(record: Record<string, any>) {
            const x = parseFloat(record[attr])
            if (!isNaN(x)) {
              this.vals.push(x)
            }
          },
          value() {
            if (this.vals.length === 0) {
              return null
            }
            this.vals.sort((a: number, b: number) => a - b)
            const i = (this.vals.length - 1) * q
            return (this.vals[Math.floor(i)] + this.vals[Math.ceil(i)]) / 2.0
          },
          format: formatter,
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }
      }
    }
  },

  runningStat(mode: 'mean' | 'var' | 'stdev' = 'mean', ddof: number = 1, formatter: NumberFormatter = usFmt): AggregatorFunction {
    return function ([attr]: string[]): AggregatorGenerator {
      return function (): Aggregator {
        return {
          n: 0.0,
          m: 0.0,
          s: 0.0,
          push(record: Record<string, any>) {
            const x = parseFloat(record[attr])
            if (isNaN(x)) {
              return
            }
            this.n += 1.0
            if (this.n === 1.0) {
              this.m = x
            }
            const m_new = this.m + (x - this.m) / this.n
            this.s = this.s + (x - this.m) * (x - m_new)
            this.m = m_new
          },
          value() {
            if (mode === 'mean') {
              if (this.n === 0) {
                return 0 / 0
              }
              return this.m
            }
            if (this.n <= ddof) {
              return 0
            }
            switch (mode) {
              case 'var':
                return this.s / (this.n - ddof)
              case 'stdev':
                return Math.sqrt(this.s / (this.n - ddof))
              default:
                throw new Error('unknown mode for runningStat')
            }
          },
          format: formatter,
          numInputs: typeof attr !== 'undefined' ? 0 : 1,
        }
      }
    }
  },

  sumOverSum(formatter: NumberFormatter = usFmt): AggregatorFunction {
    return function ([num, denom]: string[]): AggregatorGenerator {
      return function (): Aggregator {
        return {
          sumNum: 0,
          sumDenom: 0,
          push(record: Record<string, any>) {
            const x = parseFloat(record[num])
            const y = parseFloat(record[denom])
            if (!isNaN(x)) {
              this.sumNum += x
            }
            if (!isNaN(y)) {
              this.sumDenom += y
            }
          },
          value() {
            return this.sumNum / this.sumDenom
          },
          format: formatter,
          numInputs: typeof num !== 'undefined' && typeof denom !== 'undefined' ? 0 : 2,
        }
      }
    }
  },

  fractionOf(wrapped: AggregatorFunction, type: 'total' | 'row' | 'col' = 'total', formatter: NumberFormatter = usFmtPct): AggregatorFunction {
    return (vals: string[]) =>
      function (data?: any, rowKey?: any[], colKey?: any[]): Aggregator {
        return {
          selector: ({ total: [[], []], row: [rowKey, []], col: [[], colKey] } as any)[type],
          inner: wrapped(vals)(data, rowKey, colKey),
          push(record: Record<string, any>) {
            this.inner.push(record)
          },
          format: formatter,
          value() {
            const [selectorRow, selectorCol] = this.selector
            return this.inner.value() / data!.getAggregator(selectorRow, selectorCol).inner.value()
          },
          numInputs: wrapped(vals)().numInputs,
        }
      }
  },
};

aggregatorTemplates.countUnique = (f?: NumberFormatter) => aggregatorTemplates.uniques((x: any[]) => x.length, f);
aggregatorTemplates.listUnique = (s?: string) =>
  aggregatorTemplates.uniques(
    (x: any[]) => x.join(s),
    (x: any) => x
  );
aggregatorTemplates.max = (f?: NumberFormatter) => aggregatorTemplates.extremes('max', f);
aggregatorTemplates.min = (f?: NumberFormatter) => aggregatorTemplates.extremes('min', f);
aggregatorTemplates.first = (f?: NumberFormatter) => aggregatorTemplates.extremes('first', f);
aggregatorTemplates.last = (f?: NumberFormatter) => aggregatorTemplates.extremes('last', f);
aggregatorTemplates.median = (f?: NumberFormatter) => aggregatorTemplates.quantile(0.5, f);
aggregatorTemplates.average = (f?: NumberFormatter) => aggregatorTemplates.runningStat('mean', 1, f);
aggregatorTemplates.var = (ddof?: number, f?: NumberFormatter) => aggregatorTemplates.runningStat('var', ddof, f);
aggregatorTemplates.stdev = (ddof?: number, f?: NumberFormatter) => aggregatorTemplates.runningStat('stdev', ddof, f);

// default aggregators & renderers use US naming and number formatting
export const aggregators = ((tpl: any): Aggregators => ({
  Count: tpl.count(usFmtInt),
  'Count Unique Values': tpl.countUnique(usFmtInt),
  'List Unique Values': tpl.listUnique(', '),
  Sum: tpl.sum(usFmt),
  'Integer Sum': tpl.sum(usFmtInt),
  Average: tpl.average(usFmt),
  Median: tpl.median(usFmt),
  'Sample Variance': tpl.var(1, usFmt),
  'Sample Standard Deviation': tpl.stdev(1, usFmt),
  Minimum: tpl.min(usFmt),
  Maximum: tpl.max(usFmt),
  First: tpl.first(usFmt),
  Last: tpl.last(usFmt),
  'Sum over Sum': tpl.sumOverSum(usFmt),
  'Sum as Fraction of Total': tpl.fractionOf(tpl.sum(), 'total', usFmtPct),
  'Sum as Fraction of Rows': tpl.fractionOf(tpl.sum(), 'row', usFmtPct),
  'Sum as Fraction of Columns': tpl.fractionOf(tpl.sum(), 'col', usFmtPct),
  'Count as Fraction of Total': tpl.fractionOf(tpl.count(), 'total', usFmtPct),
  'Count as Fraction of Rows': tpl.fractionOf(tpl.count(), 'row', usFmtPct),
  'Count as Fraction of Columns': tpl.fractionOf(tpl.count(), 'col', usFmtPct),
}))(aggregatorTemplates)

export const locales = {
  en: {
    aggregators,
    localeStrings: {
      renderError: 'An error occurred rendering the PivotTable results.',
      computeError: 'An error occurred computing the PivotTable results.',
      uiRenderError: 'An error occurred rendering the PivotTable UI.',
      selectAll: 'Select All',
      selectNone: 'Select None',
      tooMany: '(too many to list)',
      filterResults: 'Filter values',
      apply: 'Apply',
      cancel: 'Cancel',
      totals: 'Totals',
      vs: 'vs',
      by: 'by',
    },
  },
}
