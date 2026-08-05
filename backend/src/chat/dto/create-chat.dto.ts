import { IsUUID } from 'class-validator';

export class CreateChatDto {
  @IsUUID()
  rideId!: string;
}