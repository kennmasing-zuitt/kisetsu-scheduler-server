import { Args, Authorized, Query, Resolver } from 'type-graphql';
import { Permission } from '../../../roles/index.js';
import { parseInput } from '../../../../shared/validation.js';
import type { SalesReport } from '../../db/_reports.types.js';
import { SalesReportArgs } from '../../db/report.zod.js';
import { SalesReportArgsType, SalesReportObject } from '../../dto/report.dto.js';
import * as ReportsImpl from '../../service/index.js';

@Resolver()
export class SalesReportHandler {
    @Authorized(Permission.readReports)
    @Query(() => SalesReportObject, {
        description:
            'Weekly, monthly or annual sales: services rendered per therapist and per service, ' +
            'each booking priced at the price that prevailed on its date. Requires readReports.',
    })
    async salesReport(
        @Args(() => SalesReportArgsType) args: SalesReportArgsType,
    ): Promise<SalesReport> {
        return ReportsImpl.buildSalesReport(parseInput(SalesReportArgs, args));
    }
}
