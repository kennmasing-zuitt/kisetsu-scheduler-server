import { CreateExampleHandler } from './handlers/createExample.js';
import { DeleteExampleHandler } from './handlers/deleteExample.js';
import { ExampleFieldsHandler } from './handlers/exampleFields.js';
import { FindExampleByIdHandler } from './handlers/findExampleById.js';
import { ReadExampleHandler } from './handlers/readExample.js';
import { UpdateExampleHandler } from './handlers/updateExample.js';

/**
 * Domain Namespace Pattern: every GraphQL handler (controller) of the Example domain under one
 * name. The module root registers `Object.values(ExampleHandlers)` with the schema, so adding a
 * handler here is all it takes to expose it.
 */
export const ExampleHandlers = {
    CreateExampleHandler,
    ReadExampleHandler,
    FindExampleByIdHandler,
    UpdateExampleHandler,
    DeleteExampleHandler,
    ExampleFieldsHandler,
} as const;
