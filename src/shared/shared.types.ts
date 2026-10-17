import type { ClassType } from 'type-graphql';

/** Every feature module contributes its type-graphql resolver classes to the schema. */
export interface AppModule {
    name: string;
    resolvers: ClassType[];
}
