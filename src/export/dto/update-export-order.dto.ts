import { PartialType } from "@nestjs/swagger";
import { CreateExportOrderDto } from "./create-export-order.dto";

export class UpdateExportOrderDto extends PartialType(CreateExportOrderDto) {}
