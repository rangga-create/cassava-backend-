import { PartialType } from "@nestjs/swagger";
import { CreateProcessingOrderDto } from "./create-processing-order.dto";

export class UpdateProcessingOrderDto extends PartialType(
  CreateProcessingOrderDto,
) {}
