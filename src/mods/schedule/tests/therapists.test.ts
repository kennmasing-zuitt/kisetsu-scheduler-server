import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { createAdmin, registerTestUser } from '../../auth/tests/auth.helpers.js';

const FIELDS = 'id name offDays leaveDates createdAt updatedAt';
const CREATE = `mutation ($input: CreateTherapistInput!) { createTherapist(input: $input) { ${FIELDS} } }`;
const UPDATE = `mutation ($id: ID!, $input: UpdateTherapistInput!) {
    updateTherapist(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = `mutation ($id: ID!) { deleteTherapist(id: $id) }`;
const LIST = `{ therapists { ${FIELDS} } }`;

interface TherapistT {
    id: string;
    name: string;
    offDays: number[];
    leaveDates: string[];
}

// Adding / removing therapists needs createTherapist / deleteTherapist (super admin here)
let admin = '';
beforeEach(async () => {
    admin = (await createAdmin()).token;
});

async function create(name: string, offDays?: number[]) {
    const res = await gql<{ createTherapist: TherapistT }>(
        CREATE,
        { input: { name, offDays } },
        bearer(admin),
    );
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createTherapist;
}

describe('therapists module', () => {
    it('createTherapist defaults to no days off and no leave', async () => {
        const t = await create('  Ana ');
        expect(t).toMatchObject({ name: 'Ana', offDays: [], leaveDates: [] });
    });

    it('therapists lists the roster by name', async () => {
        await create('Carla');
        await create('Ana');
        const res = await gql<{ therapists: TherapistT[] }>(LIST, undefined, bearer(admin));
        expect(res.body.data!.therapists.map((t: TherapistT) => t.name)).toEqual(['Ana', 'Carla']);
    });

    it('updateTherapist replaces the lists, de-duplicated and sorted', async () => {
        const t = await create('Ben');
        const res = await gql<{ updateTherapist: TherapistT }>(
            UPDATE,
            { id: t.id, input: { offDays: [3, 2, 3], leaveDates: ['2030-02-01', '2030-01-15'] } },
            bearer(admin),
        );
        expect(res.body.errors).toBeUndefined();
        expect(res.body.data!.updateTherapist).toMatchObject({
            name: 'Ben',
            offDays: [2, 3],
            leaveDates: ['2030-01-15', '2030-02-01'],
        });
    });

    it('rejects invalid weekdays and dates', async () => {
        const t = await create('Dana');
        const badDay = await gql(UPDATE, { id: t.id, input: { offDays: [7] } }, bearer(admin));
        expect(badDay.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');

        const badDate = await gql(
            UPDATE,
            { id: t.id, input: { leaveDates: ['2030-02-30'] } },
            bearer(admin),
        );
        expect(badDate.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('deleteTherapist deletes, then reports NOT_FOUND', async () => {
        const t = await create('Eve');
        const first = await gql<{ deleteTherapist: boolean }>(DELETE, { id: t.id }, bearer(admin));
        expect(first.body.data?.deleteTherapist).toBe(true);
        const second = await gql(DELETE, { id: t.id }, bearer(admin));
        expect(second.body.errors?.[0].extensions?.code).toBe('NOT_FOUND');
    });

    it('the default user role can edit days off but not add therapists', async () => {
        const t = await create('Ana');
        const user = await registerTestUser({ email: 'desk@example.com' });

        const updated = await gql(
            UPDATE,
            { id: t.id, input: { offDays: [0] } },
            bearer(user.token),
        );
        expect(updated.body.errors).toBeUndefined();

        const created = await gql(CREATE, { input: { name: 'X' } }, bearer(user.token));
        expect(created.body.errors?.[0]).toMatchObject({
            message: 'Missing permission: createTherapist',
            extensions: { code: 'FORBIDDEN' },
        });
    });

    it('reads require a token', async () => {
        const res = await gql(LIST);
        expect(res.body.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    });
});
