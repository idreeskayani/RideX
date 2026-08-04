import {
    Body,
    Controller,
    Post,
    Get,
    UseGuards,
    Req,
} from '@nestjs/common';

import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { Param } from '@nestjs/common';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';


@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
    constructor(
        private readonly chatService: ChatService,
    ) { }

    @Post()
    createChat(
        @Body() dto: CreateChatDto,
    ) {
        return this.chatService.createChat(
            dto.rideId,
        );
    }

    @Post(':chatId/message')
    sendMessage(
        @Param('chatId') chatId: string,
        @Body() dto: SendMessageDto,
        @Req() req: any,
    ) {
        return this.chatService.sendMessage(
            chatId,
            req.user.userId,
            dto.text,
        );
    }

    @Get(':chatId/messages')
    getMessages(
        @Param('chatId') chatId: string,
    ) {
        return this.chatService.getMessages(
            chatId,
        );
    }
}