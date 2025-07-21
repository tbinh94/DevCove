import os
from dotenv import load_dotenv
from google import genai

# Tải các biến môi trường từ file .env
load_dotenv()

# Client sẽ tự động lấy API key từ biến môi trường GEMINI_API_KEY
# Bạn cũng có thể truyền trực tiếp nếu cần: client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
client = genai.Client()

response = client.models.generate_content(
    model="gemini-2.5-flash", contents="Explain how AI works in a few words")

print(response.text)