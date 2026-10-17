import { ArgsType, Field, Int, ObjectType, type ClassType } from 'type-graphql';

/** `(page: Int = 1, limit: Int = 20)` arguments for any paginated query. */
@ArgsType()
export class PaginationArgs {
    @Field(() => Int, { nullable: true, defaultValue: 1 })
    page?: number;

    @Field(() => Int, { nullable: true, defaultValue: 20, description: 'Max 100' })
    limit?: number;
}

/**
 * Generic page type. Usage:
 *   @ObjectType('UserPage')
 *   export class UserPage extends PaginatedResponse(UserObject) {}
 */
export function PaginatedResponse<TItem extends object>(itemClass: ClassType<TItem>) {
    // Not registered on its own: type-graphql only emits types reachable from a resolver
    @ObjectType()
    abstract class PaginatedResponseClass {
        @Field(() => [itemClass])
        data!: TItem[];

        @Field(() => Int)
        page!: number;

        @Field(() => Int)
        limit!: number;

        @Field(() => Int)
        total!: number;

        @Field(() => Int)
        totalPages!: number;
    }
    return PaginatedResponseClass;
}
