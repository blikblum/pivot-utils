import { LitElement, css, html } from 'lit'
import { PivotData } from 'pivot-utils'
import { pivotTableLegacy, pivotTable, pivotHeader, pivotRow } from '../src/lit.js'
import '../styles/pivottable.css'

const fixtureData = [
  ['name', 'gender', 'colour', 'birthday', 'trials', 'successes'],
  ['Nick', 'm', 'blue', '1982-11-07', 103, 12],
  ['Jane', 'f', 'red', '1982-11-08', 95, 25],
  ['John', 'm', 'blue', '1982-12-08', 112, 30],
  ['Carol', 'f', 'yellow', '1983-12-08', 102, 12],
]

const genderLabels = { m: 'Male', f: 'Female' }

const keyFormatters = { gender: (v) => genderLabels[v] || '--' }

/**
 * An example element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
export class PivotDemo extends LitElement {
  static get properties() {
    return {}
  }

  constructor() {
    super()
    this.data = new PivotData({
      data: fixtureData,
      aggregatorName: 'Count',
      rows: ['colour'],
      cols: ['gender'],
    })
  }

  createRenderRoot() {
    return this
  }

  render() {
    return html`<h1>Pivot Utils Demo</h1>

      <h4>Table renderer</h4>
      ${pivotTable(this.data, { keyFormatters })}

      <h4>Table header</h4>
      <table class="pvtTable">
        <thead>
          ${pivotHeader(this.data, [['f'], ['m']], {
            colAttrs: ['Gender'],
            rowAttrs: ['Color'],
            colFormatters: [keyFormatters.gender],
          })}
        </thead>
      </table>

      <h4>Table row</h4>
      <table class="pvtTable">
        <tbody>
          ${pivotRow(this.data, ['blue'], [['m']], { rowFormatters: [() => 'Blue'] })}
        </tbody>
      </table>

      <h4>Legacy table renderer</h4>
      ${pivotTableLegacy(this.data)} `
  }

  static get styles() {
    return css`
      h1 {
        line-height: 1.1;
      }
    `
  }
}

window.customElements.define('pivot-demo', PivotDemo)
