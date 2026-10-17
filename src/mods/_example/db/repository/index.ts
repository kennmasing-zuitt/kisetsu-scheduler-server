// Standard Barrel Pattern: the isolated wrapper for db/repository/. Re-exports every
// data-access operation (operations/*) so callers never import the inner files directly:
//   import * as ExampleOperations from '<path>/db/repository/index.js';
export * from './operations/createExample.js';
export * from './operations/deleteExample.js';
export * from './operations/findExampleById.js';
export * from './operations/readExample.js';
export * from './operations/updateExample.js';
