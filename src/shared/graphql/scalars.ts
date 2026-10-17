import { GraphQLError, GraphQLScalarType, Kind } from 'graphql';

const toDate = (value: unknown): Date => {
    const date = value instanceof Date ? value : new Date(value as string | number);
    if (Number.isNaN(date.getTime())) {
        throw new GraphQLError(`DateTime cannot represent an invalid date: ${String(value)}`);
    }
    return date;
};

export const DateTimeScalar = new GraphQLScalarType({
    name: 'DateTime',
    description: 'ISO-8601 date-time string',
    serialize: (value) => toDate(value).toISOString(),
    parseValue: (value) => toDate(value),
    parseLiteral(ast) {
        if (ast.kind !== Kind.STRING) {
            throw new GraphQLError('DateTime must be an ISO-8601 string', { nodes: ast });
        }
        return toDate(ast.value);
    },
});
