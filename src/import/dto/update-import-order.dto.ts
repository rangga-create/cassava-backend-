import { PartialType } from "@nestjs/swagger";
import { CreateImportOrderDto } from "./create-import-order.dto";

export class UpdateImportOrderDto extends PartialType(CreateImportOrderDto) {}
