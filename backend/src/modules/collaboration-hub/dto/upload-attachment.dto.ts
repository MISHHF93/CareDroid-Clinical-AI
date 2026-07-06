import { IsString, MaxLength } from 'class-validator';

export class UploadAttachmentDto {
  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @MaxLength(120)
  mimeType: string;

  /** Base64-encoded file contents. Suitable for typical clinical attachments; a
   * streaming multipart path would be a natural follow-up for very large files. */
  @IsString()
  dataBase64: string;
}
