# pivot-utils

Core pivot table utilities extracted and modernized from [plotly/react-pivottable](https://github.com/plotly/react-pivottable).

This library provides powerful data aggregation and pivot table functionality with support for custom aggregators, formatters, and derived attributes. It's framework-agnostic at its core, with optional Lit integration for rendering.

## Features

- 🔢 **20+ Built-in Aggregators**: Count, Sum, Average, Median, Min, Max, Variance, Standard Deviation, and more
- 📊 **Flexible Data Processing**: Support for derived attributes, custom filters, and sorters
- 🎨 **Customizable Formatting**: Built-in number formatters with internationalization support
- 🧩 **Framework Integration**: Optional Lit templates for easy rendering
- 🔧 **Extensible**: Create custom aggregators using aggregator templates
- 📦 **Modern ES Modules**: Tree-shakeable exports for optimal bundle size

## Installation

```bash
npm install pivot-utils
```

or

```bash
yarn add pivot-utils
```

## Basic Usage

```javascript
import { PivotData } from 'pivot-utils'

// Sample data (can be array of objects or array of arrays)
const data = [
  ['name', 'gender', 'colour', 'birthday', 'trials', 'successes'],
  ['Nick', 'male', 'blue', '1982-11-07', 103, 12],
  ['Jane', 'female', 'red', '1982-11-08', 95, 25],
  ['John', 'male', 'blue', '1982-12-08', 112, 30],
  ['Carol', 'female', 'yellow', '1983-12-08', 102, 12],
]

// Create pivot data
const pivotData = new PivotData({
  data: data,
  rows: ['colour'],
  cols: ['gender'],
  aggregatorName: 'Count',
})

// Get aggregated values
console.log(pivotData.getAggregator([], []).value()) // Total count: 4
console.log(pivotData.getAggregator(['blue'], []).value()) // Blue count: 2
console.log(pivotData.getAggregator(['blue'], ['male']).value()) // Blue males: 2
```

## Aggregators

### Count

Counts the number of records in each cell.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Count',
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 4 (total records)
pivotData.getAggregator(['blue'], []).value() // 2 (blue items)
pivotData.getAggregator(['blue'], ['male']).value() // 2 (blue males)
```

### Count Unique Values

Counts the number of unique values in a specified field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Count Unique Values',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 3 (unique success values: 12, 25, 30)
pivotData.getAggregator(['blue'], []).value() // 2 (unique: 12, 30)
```

### List Unique Values

Lists all unique values in a specified field as a comma-separated string.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'List Unique Values',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // "12, 25, 30"
pivotData.getAggregator(['blue'], ['male']).value() // "12, 30"
```

### Sum

Sums the values of a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sum',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 79 (12+25+30+12)
pivotData.getAggregator(['blue'], []).value() // 42 (12+30)
pivotData.getAggregator(['yellow'], ['female']).value() // 12
```

### Integer Sum

Same as Sum but formats the output as an integer (no decimal places).

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Integer Sum',
  vals: ['trials'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 412
```

### Average

Calculates the mean (average) of values in a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Average',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 19.75 (79/4)
pivotData.getAggregator(['blue'], []).value() // 21 (42/2)
```

### Median

Calculates the median value of a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Median',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 18.5 (median of 12,12,25,30)
```

### Minimum

Finds the minimum value in a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Minimum',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 12
pivotData.getAggregator(['blue'], []).value() // 12
```

### Maximum

Finds the maximum value in a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Maximum',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator([], []).value() // 30
pivotData.getAggregator(['blue'], []).value() // 30
```

### First

Returns the first value in a field according to the sort order.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'First',
  vals: ['name'],
  rows: ['colour'],
  cols: ['gender'],
})

// Returns the first name encountered in each grouping
```

### Last

Returns the last value in a field according to the sort order.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Last',
  vals: ['name'],
  rows: ['colour'],
  cols: ['gender'],
})

// Returns the last name encountered in each grouping
```

### Sample Variance

Calculates the sample variance of values in a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sample Variance',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

// Calculates variance with N-1 degrees of freedom (sample variance)
```

### Sample Standard Deviation

Calculates the sample standard deviation of values in a numeric field.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sample Standard Deviation',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

// Calculates standard deviation with N-1 degrees of freedom
```

### Sum over Sum

Calculates the ratio of the sum of two numeric fields.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sum over Sum',
  vals: ['successes', 'trials'],
  rows: ['colour'],
  cols: ['gender'],
})

// Returns: sum(successes) / sum(trials)
pivotData.getAggregator([], []).value() // 0.1917... (79/412)
```

### Sum as Fraction of Total

Expresses the sum in each cell as a fraction of the grand total.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sum as Fraction of Total',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator(['blue'], []).value() // 0.5316... (42/79)
// Formatted as: "53.2%" by default
```

### Sum as Fraction of Rows

Expresses the sum in each cell as a fraction of its row total.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sum as Fraction of Rows',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator(['blue'], ['male']).value() // 1.0 (all blue males)
// Shows what percentage of the row total each cell represents
```

### Sum as Fraction of Columns

Expresses the sum in each cell as a fraction of its column total.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Sum as Fraction of Columns',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})

// Shows what percentage of the column total each cell represents
```

### Count as Fraction of Total

Expresses the count in each cell as a fraction of the grand total count.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Count as Fraction of Total',
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator(['blue'], []).value() // 0.5 (2/4)
pivotData.getAggregator(['yellow'], ['female']).value() // 0.25 (1/4)
```

### Count as Fraction of Rows

Expresses the count in each cell as a fraction of its row total count.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Count as Fraction of Rows',
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator(['blue'], ['male']).value() // 1.0 (all blue are male)
```

### Count as Fraction of Columns

Expresses the count in each cell as a fraction of its column total count.

```javascript
const pivotData = new PivotData({
  data: data,
  aggregatorName: 'Count as Fraction of Columns',
  rows: ['colour'],
  cols: ['gender'],
})

pivotData.getAggregator(['yellow'], ['female']).value() // 0.5 (1 of 2 females)
```

## Custom Aggregators

You can create custom aggregators using aggregator templates:

```javascript
import { aggregatorTemplates, numberFormat } from 'pivot-utils'

// Create a custom formatter
const customFormat = numberFormat({
  digitsAfterDecimal: 3,
  scaler: 1,
  thousandsSep: ' ',
  decimalSep: ',',
  prefix: '$',
  suffix: ' USD',
})

// Create a custom aggregator using templates
const customAggregators = {
  'Custom Sum': aggregatorTemplates.sum(customFormat),
  'Custom Average': aggregatorTemplates.average(customFormat),
  // You can also create entirely custom aggregators
  'Custom Count Plus One': aggregatorTemplates.count()(
    () => () => ({
      count: 1, // Start at 1 instead of 0
      push() {
        this.count++
      },
      value() {
        return this.count
      },
      format: numberFormat({ digitsAfterDecimal: 0 }),
    })
  ),
}

const pivotData = new PivotData({
  data: data,
  aggregators: customAggregators,
  aggregatorName: 'Custom Sum',
  vals: ['successes'],
  rows: ['colour'],
  cols: ['gender'],
})
```

## Derived Attributes

You can add computed fields to your data:

```javascript
import { derivers } from 'pivot-utils'

const pivotData = new PivotData({
  data: data,
  rows: ['age_group'],
  cols: ['gender'],
  aggregatorName: 'Count',
  derivedAttributes: {
    // Bin numeric values
    age_group: derivers.bin('age', 10), // Groups ages in bins of 10
    // Format dates
    birth_year: derivers.dateFormat('birthday', '%y'),
    birth_month: derivers.dateFormat('birthday', '%n'),
  },
})
```

## Filtering

Filter data before aggregation:

```javascript
const pivotData = new PivotData({
  data: data,
  rows: ['colour'],
  cols: ['gender'],
  aggregatorName: 'Count',
  valueFilter: {
    gender: ['male'], // Only include males
    colour: ['blue', 'red'], // Only include blue and red
  },
})
```

## Sorting

Control the sort order of rows and columns:

```javascript
import { sortAs } from 'pivot-utils'

const pivotData = new PivotData({
  data: data,
  rows: ['colour'],
  cols: ['gender'],
  aggregatorName: 'Count',
  // Sort by aggregated values
  rowOrder: 'value_a_to_z', // or 'value_z_to_a'
  colOrder: 'key_a_to_z', // or 'key_z_to_a'
  // Or use custom sorters
  sorters: {
    colour: sortAs(['red', 'blue', 'yellow']), // Custom order
    gender: (a, b) => a.localeCompare(b), // Custom function
  },
})
```

## Number Formatting

Customize number display:

```javascript
import { numberFormat } from 'pivot-utils'

const euroFormat = numberFormat({
  digitsAfterDecimal: 2,
  scaler: 1,
  thousandsSep: '.',
  decimalSep: ',',
  prefix: '€',
  suffix: '',
})

const percentFormat = numberFormat({
  digitsAfterDecimal: 1,
  scaler: 100,
  suffix: '%',
})

// Use with custom aggregators
const customAggregators = {
  'Sum (EUR)': aggregatorTemplates.sum(euroFormat),
  'Percentage': aggregatorTemplates.average(percentFormat),
}
```

## Using with Lit

The library provides Lit templates for rendering pivot tables:

```javascript
import { html, LitElement } from 'lit'
import { PivotData } from 'pivot-utils'
import { pivotTable, pivotTableLegacy, pivotHead, pivotRow } from 'pivot-utils/lit.js'
import 'pivot-utils/styles/pivottable.css'

class MyElement extends LitElement {
  render() {
    const pivotData = new PivotData({
      data: this.data,
      rows: ['colour'],
      cols: ['gender'],
      aggregatorName: 'Count',
    })

    return html`
      <!-- Full pivot table -->
      ${pivotTable(pivotData, {
        keyFormatters: { gender: (v) => v.toUpperCase() },
        onValueClick: (e) => console.log('Clicked:', e.target.textContent),
      })}

      <!-- Or use individual components -->
      <table class="pvtTable">
        <thead>
          ${pivotHead(pivotData, pivotData.getColKeys())}
        </thead>
        <tbody>
          ${pivotData.getRowKeys().map((rowKey) =>
            pivotRow(pivotData, rowKey, pivotData.getColKeys())
          )}
        </tbody>
      </table>
    `
  }
}
```

## API Reference

### PivotData Options

- `data` (required): Array of objects or array of arrays (with headers in first row)
- `rows`: Array of attribute names to use as row headers
- `cols`: Array of attribute names to use as column headers
- `vals`: Array of attribute names to pass to the aggregator
- `aggregatorName`: Name of the aggregator to use (default: 'Count')
- `aggregators`: Object mapping aggregator names to aggregator functions
- `valueFilter`: Object mapping attribute names to arrays of allowed values
- `sorters`: Object mapping attribute names to sort functions, or function returning sorters
- `rowOrder`: Sort order for rows ('key_a_to_z', 'key_z_to_a', 'value_a_to_z', 'value_z_to_a')
- `colOrder`: Sort order for columns (same options as rowOrder)
- `derivedAttributes`: Object mapping new attribute names to deriver functions

### PivotData Methods

- `getAggregator(rowKey, colKey)`: Get the aggregator for a specific cell
- `getRowKeys()`: Get array of all row keys (sorted)
- `getColKeys()`: Get array of all column keys (sorted)
- `forEachMatchingRecord(criteria, callback)`: Iterate over filtered records

### Aggregator Object

Each aggregator has these methods:
- `value()`: Returns the computed value
- `format(x)`: Returns the formatted string representation
- `push(record)`: Adds a record to the aggregation (internal use)

## Utilities

### naturalSort

Natural sorting algorithm that handles numbers in strings correctly:

```javascript
import { naturalSort } from 'pivot-utils'

const items = ['item 1', 'item 10', 'item 2', 'item 20']
items.sort(naturalSort)
// Result: ['item 1', 'item 2', 'item 10', 'item 20']
```

### sortAs

Create a custom sort order:

```javascript
import { sortAs } from 'pivot-utils'

const customSort = sortAs(['high', 'medium', 'low'])
const priorities = ['low', 'high', 'medium', 'high']
priorities.sort(customSort)
// Result: ['high', 'high', 'medium', 'low']
```

### getSort

Get the appropriate sort function for an attribute:

```javascript
import { getSort } from 'pivot-utils'

const sorters = {
  priority: sortAs(['high', 'medium', 'low']),
}

const sortFn = getSort(sorters, 'priority')
```

## Credits

This project is a modernized extraction of the core pivot table utilities from [plotly/react-pivottable](https://github.com/plotly/react-pivottable), originally created by Nicolas Kruchten. The code has been updated to use modern JavaScript (ES modules, etc.) and made framework-agnostic while maintaining the powerful aggregation capabilities.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
