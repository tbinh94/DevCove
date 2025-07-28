import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Conversation, ChatMessage

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Check if user is authenticated
        if not self.scope["user"].is_authenticated:
            await self.close()
            return
            
        # Check if user is participant in the conversation
        if not await self.is_participant():
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message = text_data_json['message']

            # Save message to database
            chat_message = await self.save_message(message)
            
            if chat_message:
                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': {
                            'id': chat_message.id,
                            'text': chat_message.text,
                            'sender_username': chat_message.sender.username,
                            'created_at': chat_message.created_at.isoformat(),
                            'sender': {
                                'id': chat_message.sender.id,
                                'username': chat_message.sender.username,
                            }
                        }
                    }
                )
        except Exception as e:
            print(f"Error in receive: {e}")
            await self.send(text_data=json.dumps({
                'error': 'Failed to send message'
            }))

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps(message))

    @database_sync_to_async
    def is_participant(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return conversation.participants.filter(id=self.scope["user"].id).exists()
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, message_text):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            message = ChatMessage.objects.create(
                conversation=conversation,
                sender=self.scope["user"],
                text=message_text
            )
            # Update conversation's updated_at timestamp
            conversation.save()
            return message
        except Exception as e:
            print(f"Error saving message: {e}")
            return None