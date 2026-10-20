// Standard Barrel Pattern: the isolated wrapper for service/. Re-exports every
// business-logic function (impl/*) so callers never import the inner files directly:
//   import * as ReportsImpl from '<path>/service/index.js';
export * from './impl/buildSalesReport.js';
export * from './impl/reportRange.js';
