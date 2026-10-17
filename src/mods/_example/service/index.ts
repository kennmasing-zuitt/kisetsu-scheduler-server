// Standard Barrel Pattern: the isolated wrapper for service/. Re-exports every
// business-logic function (impl/*) so callers never import the inner files directly:
//   import * as ExampleImpl from '<path>/service/index.js';
export * from './impl/createExample.js';
export * from './impl/deleteExample.js';
export * from './impl/findExampleById.js';
export * from './impl/readExample.js';
export * from './impl/updateExample.js';
