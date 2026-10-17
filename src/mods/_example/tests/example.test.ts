import { beforeEach, describe, it, expect } from 'vitest';
import { bearer, gql as rawGql } from '../../../tests/graphql.helpers.js';
import { registerTestUser } from '../../auth/tests/auth.helpers.js';
import { Permission } from '../../roles/index.js';
import { UsersOperations } from '../../users/index.js';

// Every request in this file is sent as a user holding all example permissions
// (the DB is wiped after each test, so the user is re-created each time)
let token = '';
beforeEach(async () => {
    const editor = await registerTestUser({ email: 'editor@example.com' });
    // The default `user` role has create + update; delete is granted as a per-user extra
    await UsersOperations.setAccess(editor.user.id, 'user', [Permission.deleteExample]);
    token = editor.token;
});
const gql = <T = Record<string, unknown>>(query: string, variables?: Record<string, unknown>) =>
    rawGql<T>(query, variables, bearer(token));

const FIELDS = 'id firstName lastName createdAt updatedAt';

const CREATE = `mutation ($input: CreateExampleInput!) { createExample(input: $input) { ${FIELDS} } }`;
const UPDATE = `mutation ($id: ID!, $input: UpdateExampleInput!) {
    updateExample(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = `mutation ($id: ID!) { deleteExample(id: $id) }`;
const GET_ONE = `query ($id: ID!) { example(id: $id) { ${FIELDS} } }`;
const LIST = `query ($page: Int, $limit: Int) {
    examples(page: $page, limit: $limit) { data { ${FIELDS} } page limit total totalPages }
}`;

interface ExampleT {
    id: string;
    firstName: string;
    lastName: string;
    createdAt: string;
    updatedAt: string;
}

const MISSING_ID = '000000000000000000000000';

async function create(firstName = 'Ada', lastName = 'Lovelace') {
    const res = await gql<{ createExample: ExampleT }>(CREATE, { input: { firstName, lastName } });
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createExample;
}

describe('example module', () => {
    it('createExample trims input and returns the new document', async () => {
        const doc = await create('  Ada ', ' Lovelace ');
        expect(doc).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace' });
        expect(doc.id).toMatch(/^[a-f0-9]{24}$/);
        expect(new Date(doc.createdAt).toISOString()).toBe(doc.createdAt);
    });

    it('createExample rejects blank names', async () => {
        const res = await gql(CREATE, { input: { firstName: '  ', lastName: 'X' } });
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('examples paginates newest first', async () => {
        await create('First', 'One');
        await create('Second', 'Two');
        await create('Third', 'Three');

        const res = await gql<{
            examples: { data: ExampleT[]; total: number; totalPages: number };
        }>(LIST, { page: 1, limit: 2 });
        const page = res.body.data!.examples;
        expect(page.total).toBe(3);
        expect(page.totalPages).toBe(2);
        expect(page.data.map((d: ExampleT) => d.firstName)).toEqual(['Third', 'Second']);
    });

    it('example returns one document, or null when missing', async () => {
        const doc = await create();
        const found = await gql<{ example: ExampleT | null }>(GET_ONE, { id: doc.id });
        expect(found.body.data?.example?.id).toBe(doc.id);

        const missing = await gql<{ example: ExampleT | null }>(GET_ONE, { id: MISSING_ID });
        expect(missing.body.errors).toBeUndefined();
        expect(missing.body.data?.example).toBeNull();
    });

    it('updateExample changes only the provided fields', async () => {
        const doc = await create();
        const res = await gql<{ updateExample: ExampleT }>(UPDATE, {
            id: doc.id,
            input: { lastName: 'Byron' },
        });
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data?.updateExample).toMatchObject({ firstName: 'Ada', lastName: 'Byron' });
    });

    it('updateExample returns NOT_FOUND for an unknown id', async () => {
        const res = await gql(UPDATE, { id: MISSING_ID, input: { firstName: 'X' } });
        expect(res.body.errors?.[0].extensions).toMatchObject({ code: 'NOT_FOUND', status: 404 });
    });

    it('updateExample requires at least one field', async () => {
        const doc = await create();
        const res = await gql(UPDATE, { id: doc.id, input: {} });
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('deleteExample deletes, then reports NOT_FOUND on a second attempt', async () => {
        const doc = await create();
        const first = await gql<{ deleteExample: boolean }>(DELETE, { id: doc.id });
        expect(first.body.data?.deleteExample).toBe(true);

        const second = await gql(DELETE, { id: doc.id });
        expect(second.body.errors?.[0].extensions?.code).toBe('NOT_FOUND');
    });

    it('rejects a malformed id with VALIDATION_ERROR instead of a server error', async () => {
        const res = await gql(DELETE, { id: 'not-an-object-id' });
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });
});

describe('example permissions', () => {
    it('reads are public', async () => {
        const res = await rawGql(LIST);
        expect(res.body.errors).toBeUndefined();
    });

    it('mutations require a token', async () => {
        const res = await rawGql(CREATE, { input: { firstName: 'A', lastName: 'B' } });
        expect(res.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });

    it('the default user role can create and update but not delete', async () => {
        const user = await registerTestUser({ email: 'plain@example.com' });
        const created = await rawGql<{ createExample: ExampleT }>(
            CREATE,
            { input: { firstName: 'A', lastName: 'B' } },
            bearer(user.token),
        );
        expect(created.body.errors).toBeUndefined();
        const id = created.body.data!.createExample.id;

        const updated = await rawGql(UPDATE, { id, input: { lastName: 'C' } }, bearer(user.token));
        expect(updated.body.errors).toBeUndefined();

        const deleted = await rawGql(DELETE, { id }, bearer(user.token));
        expect(deleted.body.errors?.[0]).toMatchObject({
            message: 'Missing permission: deleteExample',
            extensions: { code: 'FORBIDDEN' },
        });
    });
});
