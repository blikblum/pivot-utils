// Import types and functions from utilities and aggregators
import { naturalSort, getSort, type SortFunction, type Sorters, type DerivedAttributes } from './utilities.ts'
import { aggregators, type Aggregator, type AggregatorGenerator, type Aggregators } from './aggregators.ts'

// Type definitions for PivotData
export type ValueFilter = Record<string, any[]>

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

/*
Data Model class
*/

export class PivotData {
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
