import { beforeEach, describe, expect, it } from 'vitest';
import { bearer, gql } from '../../../tests/graphql.helpers.js';
import { createAdmin, registerTestUser } from '../../auth/tests/auth.helpers.js';
import { BookingModel, TherapistModel } from '../index.js';

const FIELDS = 'id name color createdAt updatedAt';
const CREATE = `mutation ($input: CreateRoomInput!) { createRoom(input: $input) { ${FIELDS} } }`;
const UPDATE = `mutation ($id: ID!, $input: UpdateRoomInput!) {
    updateRoom(id: $id, input: $input) { ${FIELDS} }
}`;
const DELETE = `mutation ($id: ID!) { deleteRoom(id: $id) }`;
const LIST = `{ rooms { ${FIELDS} } }`;

interface RoomT {
    id: string;
    name: string;
    color: string;
}

let admin = '';
beforeEach(async () => {
    admin = (await createAdmin()).token;
});

async function create(name: string, color = '#534ab7') {
    const res = await gql<{ createRoom: RoomT }>(CREATE, { input: { name, color } }, bearer(admin));
    expect(res.body.errors).toBeUndefined();
    return res.body.data!.createRoom;
}

describe('rooms module', () => {
    it('createRoom normalizes the color', async () => {
        expect(await create('Room 1')).toMatchObject({ name: 'Room 1', color: '#534AB7' });
    });

    it('rejects a color that is not #RRGGBB', async () => {
        const res = await gql(CREATE, { input: { name: 'R', color: 'red' } }, bearer(admin));
        expect(res.body.errors?.[0].extensions?.code).toBe('VALIDATION_ERROR');
    });

    it('rooms sorts names numerically', async () => {
        await create('Room 10');
        await create('Room 2');
        const res = await gql<{ rooms: RoomT[] }>(LIST, undefined, bearer(admin));
        expect(res.body.data!.rooms.map((r: RoomT) => r.name)).toEqual(['Room 2', 'Room 10']);
    });

    it('updateRoom and deleteRoom', async () => {
        const r = await create('Room 1');
        const updated = await gql<{ updateRoom: RoomT }>(
            UPDATE,
            { id: r.id, input: { name: 'Suite' } },
            bearer(admin),
        );
        expect(updated.body.data?.updateRoom).toMatchObject({ name: 'Suite', color: '#534AB7' });

        const deleted = await gql<{ deleteRoom: boolean }>(DELETE, { id: r.id }, bearer(admin));
        expect(deleted.body.data?.deleteRoom).toBe(true);
        const again = await gql(DELETE, { id: r.id }, bearer(admin));
        expect(again.body.errors?.[0].extensions?.code).toBe('NOT_FOUND');
    });

    it('deleteRoom is refused while it has upcoming bookings, allowed with only past ones', async () => {
        const x = await create('Room 1');
        const other = await TherapistModel.create({ name: 'T' });
        const HOUR = 3_600_000;
        // Inserted directly: these tests are about deleting, not the booking rules
        const booking = (start: number) =>
            BookingModel.create({
                client: 'C',
                roomId: x.id,
                therapistId: other._id,
                start: new Date(start),
                end: new Date(start + HOUR),
            });
        const upcoming = await booking(Date.now() + 24 * HOUR);
        await booking(Date.now() - 48 * HOUR);

        const refused = await gql(DELETE, { id: x.id }, bearer(admin));
        expect(refused.body.errors?.[0].extensions).toMatchObject({
            code: 'ROOM_HAS_BOOKINGS',
            status: 409,
            details: { upcoming: 1 },
        });

        await BookingModel.deleteOne({ _id: upcoming._id });
        const ok = await gql(DELETE, { id: x.id }, bearer(admin));
        expect(ok.body.errors).toBeUndefined();
    });

    it('the default user role can read rooms but not manage them', async () => {
        const user = await registerTestUser({ email: 'desk@example.com' });
        const read = await gql(LIST, undefined, bearer(user.token));
        expect(read.body.errors).toBeUndefined();

        const res = await gql(
            CREATE,
            { input: { name: 'X', color: '#000000' } },
            bearer(user.token),
        );
        expect(res.body.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    });
});
