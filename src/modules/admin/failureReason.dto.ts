import { IsEnum } from 'class-validator';
import { FailureReason } from '../groups/contribution.entity';

export class ForceFailureDto {
  @IsEnum(FailureReason)
  reason: FailureReason;
}
