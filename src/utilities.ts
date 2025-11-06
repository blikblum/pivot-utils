// Type definitions
export type SortFunction = (a: any, b: any) => number
export type Sorters = Record<string, SortFunction> | ((attr: string) => SortFunction | undefined)
export type DerivedAttributes = Record<string, (record: Record<string, any>) => any>

const rx = /(\d+)|(\D+)/g
const rd = /\d/
const rz = /^0/

export const naturalSort: SortFunction = (as: any, bs: any): number => {
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

export const sortAs = function (order: any[]): SortFunction {
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

export const getSort = function (sorters: Sorters | null | undefined, attr: string): SortFunction {
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

export const derivers = {
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
