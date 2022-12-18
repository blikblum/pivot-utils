import { html } from 'lit'

export const legacyClasses = {
  table: 'pvtTable',
  axisLabel: 'pvtAxisLabel',
  val: 'pvtVal',
  colLabel: 'pvtColLabel',
  rowLabel: 'pvtRowLabel',
  totalLabel: 'pvtTotalLabel',
  total: 'pvtTotal',
  grandTotal: 'pvtGrandTotal',
}

const defaultClasses = { ...legacyClasses }

export function setDefaultClasses(classes = {}) {
  Object.assign(defaultClasses, classes)
}

// helper function for setting row/col-span
function spanSize(arr, i, j) {
  let x
  if (i !== 0) {
    let asc, end
    let noDraw = true
    for (x = 0, end = j, asc = end >= 0; asc ? x <= end : x >= end; asc ? x++ : x--) {
      if (arr[i - 1][x] !== arr[i][x]) {
        noDraw = false
      }
    }
    if (noDraw) {
      return -1
    }
  }
  let len = 0
  while (i + len < arr.length) {
    let asc1, end1
    let stop = false
    for (x = 0, end1 = j, asc1 = end1 >= 0; asc1 ? x <= end1 : x >= end1; asc1 ? x++ : x--) {
      if (arr[i][x] !== arr[i + len][x]) {
        stop = true
      }
    }
    if (stop) {
      break
    }
    len++
  }
  return len
}

function identity(v) {
  return v
}

export function pivotHead(
  pivotData,
  colKeys,
  {
    colFormatters = [],
    colAttrs = pivotData.props.cols,
    rowAttrs = pivotData.props.rows,
    classes = defaultClasses,
  } = {}
) {
  return colAttrs.map(function (attr, attrIndex) {
    return html`
      <tr>
        ${attrIndex === 0 &&
        rowAttrs.length !== 0 &&
        html`<th colspan=${rowAttrs.length} rowspan=${colAttrs.length}></th>`}
        <th class=${classes.axisLabel}>${attr}</th>
        ${colKeys.map(function (colKey, colKeyIndex) {
          const colSpan = spanSize(colKeys, colKeyIndex, attrIndex)

          if (colSpan === -1) {
            return null
          }

          const formatter = colFormatters[attrIndex]

          return html`
            <th
              class=${classes.colLabel}
              colspan=${colSpan}
              rowspan=${attrIndex === colAttrs.length - 1 && rowAttrs.length !== 0 ? 2 : 1}
            >
              ${(formatter && formatter(colKey[attrIndex])) || colKey[attrIndex]}
            </th>
          `
        })}${attrIndex === 0 &&
        html`
          <th
            class=${classes.totalLabel}
            rowspan=${colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)}
          >
            Totals
          </th>
        `}
      </tr>
      ${rowAttrs.length !== 0 &&
      html`
        <tr>
          ${rowAttrs.map(function (attr) {
            return html` <th class=${classes.axisLabel}>${attr}</th> `
          })}
          <th class=${classes.totalLabel}>${colAttrs.length === 0 ? 'Totals' : null}</th>
        </tr>
      `}
    `
  })
}

export function pivotRow(
  pivotData,
  rowKey,
  colKeys,
  { rowFormatters = [], classes = defaultClasses } = {}
) {
  const colAttrs = pivotData.props.cols
  const totalAggregator = pivotData.getAggregator(rowKey, [])
  return html`
    <tr>
      ${rowKey.map(function (keyValue, keyValueIndex) {
        const formatter = rowFormatters[keyValueIndex]
        return html`
          <th
            class=${classes.rowLabel}
            colspan=${keyValueIndex === rowKey.length - 1 && colAttrs.length !== 0 ? 2 : 1}
          >
            ${(formatter && formatter(keyValue)) || keyValue}
          </th>
        `
      })}
      ${colKeys.map(function (colKey) {
        const aggregator = pivotData.getAggregator(rowKey, colKey)
        return html` <td class=${classes.val}>${aggregator.format(aggregator.value())}</td> `
      })}
      <td class=${classes.total}>${totalAggregator.format(totalAggregator.value())}</td>
    </tr>
  `
}

export function pivotTable(pivotData, { keyFormatters = {}, classes = defaultClasses } = {}) {
  const colAttrs = pivotData.props.cols || []
  const rowAttrs = pivotData.props.rows || []
  const rowKeys = pivotData.getRowKeys()
  const colKeys = pivotData.getColKeys()
  const grandTotalAggregator = pivotData.getAggregator([], [])

  const colFormatters = colAttrs.map((attr) => keyFormatters[attr] || identity)
  const rowFormatters = rowAttrs.map((attr) => keyFormatters[attr] || identity)

  return html`
    <table class=${classes.table}>
      <thead>
        ${pivotHead(pivotData, colKeys, { colFormatters })}
      </thead>
      <tbody>
        ${rowKeys.map(function (rowKey) {
          return pivotRow(pivotData, rowKey, colKeys, { rowFormatters })
        })}
        <tr>
          <th
            class=${classes.totalLabel}
            colspan=${rowAttrs.length + (colAttrs.length === 0 ? 0 : 1)}
          >
            Totals
          </th>
          ${colKeys.map(function (colKey) {
            const totalAggregator = pivotData.getAggregator([], colKey)
            return html`
              <td class=${classes.total}>${totalAggregator.format(totalAggregator.value())}</td>
            `
          })}
          <td class=${classes.grandTotal}>
            ${grandTotalAggregator.format(grandTotalAggregator.value())}
          </td>
        </tr>
      </tbody>
    </table>
  `
}

export function pivotTableLegacy(pivotData, options = {}) {
  const colAttrs = pivotData.props.cols || []
  const rowAttrs = pivotData.props.rows || []
  const rowKeys = pivotData.getRowKeys()
  const colKeys = pivotData.getColKeys()
  const grandTotalAggregator = pivotData.getAggregator([], [])

  let valueCellColors = () => ''
  let rowTotalColors = () => ''
  let colTotalColors = () => ''
  if (options.heatmapMode) {
    const colorScaleGenerator = options.tableColorScaleGenerator
    const rowTotalValues = colKeys.map((x) => pivotData.getAggregator([], x).value())
    rowTotalColors = colorScaleGenerator(rowTotalValues)
    const colTotalValues = rowKeys.map((x) => pivotData.getAggregator(x, []).value())
    colTotalColors = colorScaleGenerator(colTotalValues)

    if (options.heatmapMode === 'full') {
      const allValues = []
      rowKeys.map((r) => colKeys.map((c) => allValues.push(pivotData.getAggregator(r, c).value())))
      const colorScale = colorScaleGenerator(allValues)
      valueCellColors = (r, c, v) => colorScale(v)
    } else if (options.heatmapMode === 'row') {
      const rowColorScales = {}
      rowKeys.map((r) => {
        const rowValues = colKeys.map((x) => pivotData.getAggregator(r, x).value())
        rowColorScales[r] = colorScaleGenerator(rowValues)
      })
      valueCellColors = (r, c, v) => rowColorScales[r](v)
    } else if (options.heatmapMode === 'col') {
      const colColorScales = {}
      colKeys.map((c) => {
        const colValues = rowKeys.map((x) => pivotData.getAggregator(x, c).value())
        colColorScales[c] = colorScaleGenerator(colValues)
      })
      valueCellColors = (r, c, v) => colColorScales[c](v)
    }
  }

  const getClickHandler =
    options.tableOptions && options.tableOptions.clickCallback
      ? (value, rowValues, colValues) => {
          const filters = {}
          for (const i of Object.keys(colAttrs)) {
            const attr = colAttrs[i]
            if (colValues[i] !== null) {
              filters[attr] = colValues[i]
            }
          }
          for (const i of Object.keys(rowAttrs)) {
            const attr = rowAttrs[i]
            if (rowValues[i] !== null) {
              filters[attr] = rowValues[i]
            }
          }
          return (e) => options.tableOptions.clickCallback(e, value, filters, pivotData)
        }
      : null

  return html`
    <table class="pvtTable">
      <thead>
        ${colAttrs.map(function (c, j) {
          return html`
            <tr key=${`colAttr${j}`}>
              ${j === 0 &&
              rowAttrs.length !== 0 &&
              html` <th colspan=${rowAttrs.length} rowspan=${colAttrs.length}></th> `}
              <th class="pvtAxisLabel">${c}</th>
              ${colKeys.map(function (colKey, i) {
                const x = spanSize(colKeys, i, j)

                if (x === -1) {
                  return null
                }

                return html`
                  <th
                    class="pvtColLabel"
                    key=${`colKey${i}`}
                    colspan=${x}
                    rowspan=${j === colAttrs.length - 1 && rowAttrs.length !== 0 ? 2 : 1}
                  >
                    ${colKey[j]}
                  </th>
                `
              })}${j === 0 &&
              html`
                <th
                  class="pvtTotalLabel"
                  rowspan=${colAttrs.length + (rowAttrs.length === 0 ? 0 : 1)}
                >
                  Totals
                </th>
              `}
            </tr>
          `
        })}${rowAttrs.length !== 0 &&
        html`
          <tr>
            ${rowAttrs.map(function (r, i) {
              return html` <th class="pvtAxisLabel" key=${`rowAttr${i}`}>${r}</th> `
            })}
            <th class="pvtTotalLabel">${colAttrs.length === 0 ? 'Totals' : null}</th>
          </tr>
        `}
      </thead>
      <tbody>
        ${rowKeys.map(function (rowKey, i) {
          const totalAggregator = pivotData.getAggregator(rowKey, [])
          return html`
            <tr key=${`rowKeyRow${i}`}>
              ${rowKey.map(function (txt, j) {
                const x = spanSize(rowKeys, i, j)

                if (x === -1) {
                  return null
                }

                return html`
                  <th
                    key=${`rowKeyLabel${i}-${j}`}
                    class="pvtRowLabel"
                    rowspan=${x}
                    colspan=${j === rowAttrs.length - 1 && colAttrs.length !== 0 ? 2 : 1}
                  >
                    ${txt}
                  </th>
                `
              })}${colKeys.map(function (colKey, j) {
                const aggregator = pivotData.getAggregator(rowKey, colKey)
                return html`
                  <td
                    class="pvtVal"
                    key=${`pvtVal${i}-${j}`}
                    @click=${getClickHandler && getClickHandler(aggregator.value(), rowKey, colKey)}
                    style=${valueCellColors(rowKey, colKey, aggregator.value())}
                  >
                    ${aggregator.format(aggregator.value())}
                  </td>
                `
              })}
              <td
                class="pvtTotal"
                @click=${getClickHandler &&
                getClickHandler(totalAggregator.value(), rowKey, [null])}
                style=${colTotalColors(totalAggregator.value())}
              >
                ${totalAggregator.format(totalAggregator.value())}
              </td>
            </tr>
          `
        })}
        <tr>
          <th class="pvtTotalLabel" colspan=${rowAttrs.length + (colAttrs.length === 0 ? 0 : 1)}>
            Totals
          </th>
          ${colKeys.map(function (colKey, i) {
            const totalAggregator = pivotData.getAggregator([], colKey)
            return html`
              <td
                class="pvtTotal"
                key=${`total${i}`}
                @click=${getClickHandler &&
                getClickHandler(totalAggregator.value(), [null], colKey)}
                style=${rowTotalColors(totalAggregator.value())}
              >
                ${totalAggregator.format(totalAggregator.value())}
              </td>
            `
          })}
          <td
            @click=${getClickHandler &&
            getClickHandler(grandTotalAggregator.value(), [null], [null])}
            class="pvtGrandTotal"
          >
            ${grandTotalAggregator.format(grandTotalAggregator.value())}
          </td>
        </tr>
      </tbody>
    </table>
  `
}
