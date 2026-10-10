import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { WithHistoryDto } from "../../common/history.dto.js";

export class AskDto extends WithHistoryDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;
}
