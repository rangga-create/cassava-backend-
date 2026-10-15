import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from "@nestjs/swagger";
import { ContactService } from "./contact.service";
import { CreateContactDto } from "./dto/contact.dto";

@ApiTags("contact")
@Controller("contact")
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Submit contact form",
    description:
      "Submit a contact form. Sends confirmation email to the user and notification to admin.",
  })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({
    status: 201,
    description: "Contact form submitted successfully",
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  submitContact(@Body() dto: CreateContactDto) {
    return this.contactService.submitContactForm(dto);
  }
}
