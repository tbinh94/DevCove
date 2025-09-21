import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Conversation, ChatMessage
from .serializers import ChatMessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        
        # Kiểm tra user đã đăng nhập chưa
        if not user.is_authenticated:
            print(f"[TỪ CHỐI] Lý do: User chưa được xác thực.")
            await self.close()
            return
            
        print(f"[THÀNH CÔNG] User '{user.username}' đã được xác thực.")
        
        # Kiểm tra user có phải là thành viên cuộc trò chuyện không
        is_member = await self.is_participant()
        if not is_member:
            print(f"[TỪ CHỐI] Lý do: User '{user.username}' không phải thành viên của cuộc trò chuyện '{self.conversation_id}'.")
            await self.close()
            return

        print(f"[THÀNH CÔNG] User '{user.username}' là thành viên. Chấp nhận kết nối.")

        # Tham gia vào group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        print(f"--- Kết nối WebSocket cho '{self.room_group_name}' đã được chấp nhận. ---")

    async def disconnect(self, close_code):
        print(f"--- WebSocket đã ngắt kết nối, mã lỗi: {close_code} ---")
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    @database_sync_to_async
    def create_message_payload(self, message_obj):
        """
        Tạo payload message an toàn cho WebSocket (không dùng serializer để tránh lỗi UUID)
        """
        try:
            return {
                'id': str(message_obj.id),  # Chuyển UUID thành string
                'text': message_obj.text,
                'message': message_obj.text,  # Để tương thích với frontend
                'sender_username': message_obj.sender.username,
                'sender': {
                    'id': message_obj.sender.id,
                    'username': message_obj.sender.username
                },
                'created_at': message_obj.created_at.isoformat(),  # Chuyển datetime thành ISO string
                'conversation': str(message_obj.conversation.id)
            }
        except Exception as e:
            print(f"Lỗi khi tạo payload: {e}")
            return None
    
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_text = text_data_json['message']

            # Lưu tin nhắn vào DB
            chat_message = await self.save_message(message_text)

            if chat_message:
                # Tạo payload an toàn không chứa UUID objects
                message_payload = await self.create_message_payload(chat_message)
                
                if message_payload:
                    # Gửi payload đã được serialize đi
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'chat_message',
                            'message': message_payload 
                        }
                    )
                else:
                    print("Không thể tạo payload message")
                    
        except json.JSONDecodeError:
            print("Lỗi decode JSON")
            await self.send(text_data=json.dumps({'error': 'Invalid JSON format'}))
        except KeyError:
            print("Thiếu trường 'message' trong dữ liệu")
            await self.send(text_data=json.dumps({'error': 'Message field is required'}))
        except Exception as e:
            print(f"Lỗi trong receive: {e}")
            await self.send(text_data=json.dumps({'error': 'Không thể gửi tin nhắn'}))

    async def chat_message(self, event):
        """
        Nhận message từ room group và gửi đến WebSocket
        """
        message = event['message']
        
        try:
            # Gửi message đến client
            await self.send(text_data=json.dumps(message))
        except Exception as e:
            print(f"Lỗi khi gửi message đến client: {e}")

    @database_sync_to_async
    def is_participant(self):
        user = self.scope["user"]
        print(f"  [Kiểm tra DB] Đang kiểm tra user '{user.username}' (ID: {user.id}) trong cuộc trò chuyện '{self.conversation_id}'")
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            is_member = conversation.participants.filter(id=user.id).exists()
            print(f"  [Kiểm tra DB] Tìm thấy cuộc trò chuyện. Kết quả kiểm tra thành viên: {is_member}")
            return is_member
        except Conversation.DoesNotExist:
            print(f"  [Kiểm tra DB] THẤT BẠI. Không tồn tại cuộc trò chuyện với ID '{self.conversation_id}'.")
            return False
        except Exception as e:
            # Bắt các lỗi khác, ví dụ: id không phải là UUID hợp lệ
            print(f"  [Kiểm tra DB] THẤT BẠI. Đã xảy ra lỗi không mong muốn: {e}")
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
            # Cập nhật thời gian của conversation
            conversation.save()
            print(f"Đã lưu tin nhắn: ID={message.id}, Text='{message_text}', User='{self.scope['user'].username}'")
            return message
        except Exception as e:
            print(f"Lỗi khi lưu tin nhắn: {e}")
            return None