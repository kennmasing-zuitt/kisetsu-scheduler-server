import request from 'supertest';
import { GRAPHQL_PATH } from '../core/config/graphql.js';
import { createApp } from '../core/loaders/app.js';

export const { app } = await createApp();

export interface GraphQLResponseBody<TData> {
    data?: TData | null;
    errors?: {
        message: string;
        path?: string[];
        extensions?: { code?: string; status?: number; details?: unknown };
    }[];
}

/** POSTs a GraphQL operation and returns the supertest response (status, headers, body). */
export async function gql<TData = Record<string, unknown>>(
    query: string,
    variables?: Record<string, unknown>,
    headers: Record<string, string> = {},
) {
    const res = await request(app)
        .post(GRAPHQL_PATH)
        .set('Content-Type', 'application/json')
        .set(headers)
        .send({ query, variables });
    return res as typeof res & { body: GraphQLResponseBody<TData> };
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
