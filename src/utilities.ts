// Type definitions
export type SortFunction = (a: any, b: any) => number
export type Sorters = Record<string, SortFunction> | ((attr: string) => SortFunction | undefined)
export type NumberFormatter = (x: number) => string
export type ValueFilter = Record<string, any[]>
export type DerivedAttributes = Record<string, (record: Record<string, any>) => any>

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

export type AggregatorGenerator = (data?: PivotData, rowKey?: any[], colKey?: any[]) => Aggregator

export type AggregatorFunction = (vals: string[]) => AggregatorGenerator

export interface Aggregators {
  [key: string]: AggregatorFunction
}

export interface PivotDataProps {
  data?: any[] | ((record: (record: Record<string, any>) => void) => void)
  aggregators?: Aggregators
  aggregatorName?: string
  cols?: string[]
  rows?: string[]
  vals?: string[]
  valueFilter?: ValueFilter
  sorters?: Sorters
  rowOrder?: 'key_a_to_z' | 'key_z_to_a' | 'value_a_to_z' | 'value_z_to_a'
  colOrder?: 'key_a_to_z' | 'key_z_to_a' | 'value_a_to_z' | 'value_z_to_a'
  derivedAttributes?: DerivedAttributes
}

const zeroCharCodeStr = String.fromCharCode(0)

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

const numberFormat = function (opts_in?: NumberFormatOptions): NumberFormatter {
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

const rx = /(\d+)|(\D+)/g
const rd = /\d/
const rz = /^0/
const naturalSort: SortFunction = (as: any, bs: any): number => {
  // nulls first
  if (bs !== null && as === null) {
    return -1
  }
  if (as !== null && bs === null) {
    return 1
  }

  // then raw NaNs
  if (typeof as === 'number' && isNaN(as)) {
    return -1
  }
  if (typeof bs === 'number' && isNaN(bs)) {
    return 1
  }

  // numbers and numbery strings group together
  const nas = Number(as)
  const nbs = Number(bs)
  if (nas < nbs) {
    return -1
  }
  if (nas > nbs) {
    return 1
  }

  // within that, true numbers before numbery strings
  if (typeof as === 'number' && typeof bs !== 'number') {
    return -1
  }
  if (typeof bs === 'number' && typeof as !== 'number') {
    return 1
  }
  if (typeof as === 'number' && typeof bs === 'number') {
    return 0
  }

  // 'Infinity' is a textual number, so less than 'A'
  if (isNaN(nbs) && !isNaN(nas)) {
    return -1
  }
  if (isNaN(nas) && !isNaN(nbs)) {
    return 1
  }

  // finally, "smart" string sorting per http://stackoverflow.com/a/4373421/112871
  let a = String(as)
  let b = String(bs)
  if (a === b) {
    return 0
  }
  if (!rd.test(a) || !rd.test(b)) {
    return a > b ? 1 : -1
  }

  // special treatment for strings containing digits
  const aMatches = a.match(rx)!
  const bMatches = b.match(rx)!
  while (aMatches.length && bMatches.length) {
    const a1 = aMatches.shift()!
    const b1 = bMatches.shift()!
    if (a1 !== b1) {
      if (rd.test(a1) && rd.test(b1)) {
        return Number(a1.replace(rz, '.0')) - Number(b1.replace(rz, '.0'))
      }
      return a1 > b1 ? 1 : -1
    }
  }
  return aMatches.length - bMatches.length
}

const sortAs = function (order: any[]): SortFunction {
  const mapping: Record<string, number> = {}

  // sort lowercased keys similarly
  const l_mapping: Record<string, number> = {}
  for (const i in order) {
    const x = order[i]
    mapping[x] = Number(i)
    if (typeof x === 'string') {
      l_mapping[x.toLowerCase()] = Number(i)
    }
  }
  return function (a: any, b: any): number {
    if (a in mapping && b in mapping) {
      return mapping[a] - mapping[b]
    } else if (a in mapping) {
      return -1
    } else if (b in mapping) {
      return 1
    } else if (a in l_mapping && b in l_mapping) {
      return l_mapping[a] - l_mapping[b]
    } else if (a in l_mapping) {
      return -1
    } else if (b in l_mapping) {
      return 1
    }
    return naturalSort(a, b)
  }
}

const getSort = function (sorters: Sorters | null | undefined, attr: string): SortFunction {
  if (sorters) {
    if (typeof sorters === 'function') {
      const sort = sorters(attr)
      if (typeof sort === 'function') {
        return sort
      }
    } else if (attr in sorters) {
      return sorters[attr]
    }
  }
  return naturalSort
}

// aggregator templates default to US number formatting but this is overrideable
const usFmt = numberFormat()
const usFmtInt = numberFormat({ digitsAfterDecimal: 0 })
const usFmtPct = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
})

const aggregatorTemplates: any = {
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
      return function (data?: PivotData): Aggregator {
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
      function (data?: PivotData, rowKey?: any[], colKey?: any[]): Aggregator {
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
const aggregators = ((tpl: any): Aggregators => ({
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

const locales = {
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

// dateFormat deriver l10n requires month and day names to be passed in directly
const mthNamesEn = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]
const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const zeroPad = (number: number): string => `0${number}`.substr(-2, 2) // eslint-disable-line no-magic-numbers

function getValue(v: any): any {
  return (v && v.valueOf()) || v
}

function normalizeValueFilter(valueFilter?: ValueFilter | any): ValueFilter {
  if (!valueFilter) {
    return {}
  }

  if (typeof valueFilter === 'object') {
    let invalid = false
    for (const values of Object.values(valueFilter)) {
      if (!Array.isArray(values)) {
        invalid = true
        break
      }
    }
    if (!invalid) {
      return valueFilter as ValueFilter
    }
  }

  throw new Error('PivotData: valueFilter should be an object with array values')
}

const derivers = {
  bin(col: string, binWidth: number): (record: Record<string, any>) => number {
    return (record: Record<string, any>) => record[col] - (record[col] % binWidth)
  },
  dateFormat(col: string, formatString: string, utcOutput: boolean = false, mthNames: string[] = mthNamesEn, dayNames: string[] = dayNamesEn): (record: Record<string, any>) => string {
    const utc = utcOutput ? 'UTC' : ''
    return function (record: Record<string, any>): string {
      const date = new Date(Date.parse(record[col]))
      if (isNaN(date.getTime())) {
        return ''
      }
      return formatString.replace(/%(.)/g, function (_m: string, p: string): string {
        switch (p) {
          case 'y':
            return String((date as any)[`get${utc}FullYear`]())
          case 'm':
            return zeroPad((date as any)[`get${utc}Month`]() + 1)
          case 'n':
            return mthNames[(date as any)[`get${utc}Month`]()]
          case 'd':
            return zeroPad((date as any)[`get${utc}Date`]())
          case 'w':
            return dayNames[(date as any)[`get${utc}Day`]()]
          case 'x':
            return String((date as any)[`get${utc}Day`]())
          case 'H':
            return zeroPad((date as any)[`get${utc}Hours`]())
          case 'M':
            return zeroPad((date as any)[`get${utc}Minutes`]())
          case 'S':
            return zeroPad((date as any)[`get${utc}Seconds`]())
          default:
            return `%${p}`
        }
      })
    }
  },
}

/*
Data Model class
*/

class PivotData {
  props: Required<Omit<PivotDataProps, 'data'>> & { data: any[] | ((record: (record: Record<string, any>) => void) => void) }
  aggregator: AggregatorGenerator
  tree: Record<string, Record<string, Aggregator>>
  rowKeys: any[][]
  colKeys: any[][]
  rowTotals: Record<string, Aggregator>
  colTotals: Record<string, Aggregator>
  allTotal: Aggregator
  sorted: boolean

  constructor(inputProps: PivotDataProps = {}) {
    this.props = Object.assign({}, PivotData.defaultProps, inputProps) as any

    this.props.valueFilter = normalizeValueFilter(this.props.valueFilter)
    this.aggregator = this.props.aggregators[this.props.aggregatorName](this.props.vals)
    this.tree = {}
    this.rowKeys = []
    this.colKeys = []
    this.rowTotals = {}
    this.colTotals = {}
    this.allTotal = this.aggregator(this, [], [])
    this.sorted = false

    // iterate through input, accumulating data for cells
    PivotData.forEachRecord(this.props.data, this.props.derivedAttributes, (record: Record<string, any>) => {
      if (this.filter(record)) {
        this.processRecord(record)
      }
    })
  }

  filter(record: Record<string, any>): boolean {
    for (const k in this.props.valueFilter) {
      if (!this.props.valueFilter[k].some((value: any) => getValue(value) === getValue(record[k]))) {
        return false
      }
    }
    return true
  }

  forEachMatchingRecord(criteria: Record<string, any>, callback: (record: Record<string, any>) => void): any {
    return PivotData.forEachRecord(this.props.data, this.props.derivedAttributes, (record: Record<string, any>) => {
      if (!this.filter(record)) {
        return
      }
      for (const k in criteria) {
        const v = criteria[k]
        if (v !== (k in record ? record[k] : 'null')) {
          return
        }
      }
      callback(record)
    })
  }

  arrSort(attrs: string[]): SortFunction {
    const sortersArr: SortFunction[] = []
    for (const attr of attrs) {
      sortersArr.push(getSort(this.props.sorters, attr))
    }

    return function (a: any[], b: any[]): number {
      for (let i = 0; i < sortersArr.length; i++) {
        const sorter = sortersArr[i]
        const comparison = sorter(a[i], b[i])
        if (comparison !== 0) {
          return comparison
        }
      }
      return 0
    }
  }

  sortKeys(): void {
    if (!this.sorted) {
      this.sorted = true
      const v = (r: any[], c: any[]) => this.getAggregator(r, c).value()
      switch (this.props.rowOrder) {
        case 'value_a_to_z':
          this.rowKeys.sort((a, b) => naturalSort(v(a, []), v(b, [])))
          break
        case 'value_z_to_a':
          this.rowKeys.sort((a, b) => -naturalSort(v(a, []), v(b, [])))
          break
        default:
          this.rowKeys.sort(this.arrSort(this.props.rows))
      }
      switch (this.props.colOrder) {
        case 'value_a_to_z':
          this.colKeys.sort((a, b) => naturalSort(v([], a), v([], b)))
          break
        case 'value_z_to_a':
          this.colKeys.sort((a, b) => -naturalSort(v([], a), v([], b)))
          break
        default:
          this.colKeys.sort(this.arrSort(this.props.cols))
      }
    }
  }

  getColKeys(): any[][] {
    this.sortKeys()
    return this.colKeys
  }

  getRowKeys(): any[][] {
    this.sortKeys()
    return this.rowKeys
  }

  processRecord(record: Record<string, any>): void {
    // this code is called in a tight loop
    const colKey: any[] = []
    const rowKey: any[] = []
    for (const x of this.props.cols) {
      colKey.push(x in record ? record[x] : 'null')
    }
    for (const x of this.props.rows) {
      rowKey.push(x in record ? record[x] : 'null')
    }
    const flatRowKey = rowKey.join(zeroCharCodeStr)
    const flatColKey = colKey.join(zeroCharCodeStr)

    this.allTotal.push(record)

    if (rowKey.length !== 0) {
      if (!this.rowTotals[flatRowKey]) {
        this.rowKeys.push(rowKey)
        this.rowTotals[flatRowKey] = this.aggregator(this, rowKey, [])
      }
      this.rowTotals[flatRowKey].push(record)
    }

    if (colKey.length !== 0) {
      if (!this.colTotals[flatColKey]) {
        this.colKeys.push(colKey)
        this.colTotals[flatColKey] = this.aggregator(this, [], colKey)
      }
      this.colTotals[flatColKey].push(record)
    }

    if (colKey.length !== 0 && rowKey.length !== 0) {
      if (!this.tree[flatRowKey]) {
        this.tree[flatRowKey] = {}
      }
      if (!this.tree[flatRowKey][flatColKey]) {
        this.tree[flatRowKey][flatColKey] = this.aggregator(this, rowKey, colKey)
      }
      this.tree[flatRowKey][flatColKey].push(record)
    }
  }

  getAggregator(rowKey: any[], colKey: any[]): Aggregator {
    let agg: Aggregator | undefined
    const flatRowKey = rowKey.join(zeroCharCodeStr)
    const flatColKey = colKey.join(zeroCharCodeStr)
    if (rowKey.length === 0 && colKey.length === 0) {
      agg = this.allTotal
    } else if (rowKey.length === 0) {
      agg = this.colTotals[flatColKey]
    } else if (colKey.length === 0) {
      agg = this.rowTotals[flatRowKey]
    } else {
      agg = (this.tree[flatRowKey] || {})[flatColKey]
    }
    return (
      agg || {
        value() {
          return null
        },
        format() {
          return ''
        },
        push() {},
      }
    )
  }

  static defaultProps: Required<Omit<PivotDataProps, 'data'>> & { data: any[] } = {
    data: [],
    aggregators: aggregators,
    cols: [],
    rows: [],
    vals: [],
    aggregatorName: 'Count',
    sorters: {},
    rowOrder: 'key_a_to_z',
    colOrder: 'key_a_to_z',
    derivedAttributes: {},
    valueFilter: {},
  }

  static forEachRecord(
    input: any[] | ((record: (record: Record<string, any>) => void) => void),
    derivedAttributes: DerivedAttributes,
    f: (record: Record<string, any>) => void
  ): any {
    let addRecord: (record: Record<string, any>) => void
    let record: Record<string, any>
    if (Object.getOwnPropertyNames(derivedAttributes).length === 0) {
      addRecord = f
    } else {
      addRecord = function (record: Record<string, any>) {
        for (const k in derivedAttributes) {
          const derived = derivedAttributes[k](record)
          if (derived !== null) {
            record[k] = derived
          }
        }
        return f(record)
      }
    }

    // if it's a function, have it call us back
    if (typeof input === 'function') {
      return input(addRecord)
    } else if (Array.isArray(input)) {
      const result: any[] = []
      if (Array.isArray(input[0])) {
        // array of arrays
        for (const i of Object.keys(input || {})) {
          const compactRecord = input[Number(i)]
          if (Number(i) > 0) {
            record = {}
            for (const j of Object.keys(input[0] || {})) {
              const k = input[0][Number(j)]
              record[k] = compactRecord[Number(j)]
            }
            result.push(addRecord(record))
          }
        }
        return result
      }

      // array of objects
      for (record of input) {
        result.push(addRecord(record))
      }
      return result
    }
    throw new Error('unknown input format')
  }
}

export {
  aggregatorTemplates,
  aggregators,
  derivers,
  locales,
  naturalSort,
  numberFormat,
  getSort,
  sortAs,
  PivotData,
}
