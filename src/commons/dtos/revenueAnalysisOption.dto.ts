import { IsEnum, IsNumberString, IsOptional, ValidationArguments } from 'class-validator';
import { Interval } from '../../constants/analysis';
import { IsDateInThePast, IsStartDateBeforeEndDate } from '../../decorators';
import { Error } from '../../constants';
import { t } from 'i18next';

export class RevenueAnalysisOption {
  @IsOptional()
  @IsDateInThePast({
    message: (args: ValidationArguments) =>
      t(Error.PAST_DATE),
  })
  @IsStartDateBeforeEndDate('endDate', {
    message: (args: ValidationArguments) =>
      t(Error.INVALID_START_DATE),
  })
  startDate?: Date;

  @IsOptional()
  @IsDateInThePast({
    message: (args: ValidationArguments) =>
      t(Error.PAST_DATE),
  })
  endDate?: Date;

  @IsEnum(Interval)
  interval: Interval = Interval.DAY;

  @IsOptional()
  @IsNumberString()
  storeId?: number;

  @IsOptional()
  @IsNumberString()
  categoryId?: number;
}
