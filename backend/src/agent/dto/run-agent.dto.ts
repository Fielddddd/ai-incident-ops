import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { WithHistoryDto } from "../../common/history.dto.js";

export class RunAgentDto extends WithHistoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  prompt!: string;
}
