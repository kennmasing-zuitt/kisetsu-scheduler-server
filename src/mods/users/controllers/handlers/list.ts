import { Args, Query, Resolver } from 'type-graphql';
import { PaginationArgs } from '../../../../shared/graphql/pagination.types.js';
import { PaginationSchema, type Paginated } from '../../../../shared/pagination.js';
import { parseInput } from '../../../../shared/validation.js';
import type { PublicUser } from '../../db/_users.types.js';
import { UserPage } from '../../dto/user.dto.js';
import * as UsersImpl from '../../service/index.js';

@Resolver()
export class ListUsersHandler {
    @Query(() => UserPage, {
        description: 'Paginated list of users, newest first. (was GET /api/v1/users)',
    })
    async users(@Args(() => PaginationArgs) args: PaginationArgs): Promise<Paginated<PublicUser>> {
        return UsersImpl.list(parseInput(PaginationSchema, args));
    }
}
