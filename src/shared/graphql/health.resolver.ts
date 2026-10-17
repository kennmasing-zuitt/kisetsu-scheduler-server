import { Query, Resolver } from 'type-graphql';

@Resolver()
export class HealthResolver {
    @Query(() => String, { description: 'Liveness check that goes through the GraphQL pipeline' })
    health(): string {
        return 'ok';
    }
}
