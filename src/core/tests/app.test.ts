import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { app, gql } from '../../tests/graphql.helpers.js';

describe('app shell', () => {
    it('GET /health answers for liveness probes', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ status: 'ok' });
    });

    it('query health goes through the GraphQL pipeline', async () => {
        const res = await gql<{ health: string }>('{ health }');
        expect(res.body.data?.health).toBe('ok');
    });

    it('echoes a provided X-Request-Id', async () => {
        const res = await gql('{ health }', undefined, { 'X-Request-Id': 'abc-123' });
        expect(res.headers['x-request-id']).toBe('abc-123');
    });

    it('old REST routes are gone and answer 404 with a hint', async () => {
        const res = await request(app).post('/api/v1/auth/register').send({});
        expect(res.status).toBe(404);
        expect(res.body.errors[0].extensions.code).toBe('NOT_FOUND');
        expect(res.body.errors[0].message).toContain('/graphql');
    });

    it('malformed JSON is a 400, not a 500', async () => {
        const res = await request(app)
            .post('/graphql')
            .set('Content-Type', 'application/json')
            .send('{"query": ');
        expect(res.status).toBe(400);
        expect(res.body.errors[0].extensions.code).toBe('BAD_REQUEST');
    });

    it('blocks CSRF-able GET requests without a preflight header', async () => {
        const res = await request(app).get('/graphql').query({ query: '{ health }' });
        expect(res.status).toBe(400);
    });

    it('allows GET queries with the apollo-require-preflight header', async () => {
        const res = await request(app)
            .get('/graphql')
            .set('apollo-require-preflight', 'true')
            .query({ query: '{ health }' });
        expect(res.status).toBe(200);
        expect(res.body.data.health).toBe('ok');
    });

    it('rejects a disallowed CORS origin', async () => {
        const res = await request(app)
            .post('/graphql')
            .set('Origin', 'https://evil.example')
            .set('Content-Type', 'application/json')
            .send({ query: '{ health }' });
        expect(res.status).toBe(403);
        expect(res.body.errors[0].extensions.code).toBe('CORS_NOT_ALLOWED');
    });
});
