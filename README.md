-----

# DevCove

DevCove is a community platform for developers where you can post articles, discuss, chat in real-time, and get AI feedback on your code.

## 🚀 Features

  - **Create and share posts** with code syntax highlighting
  - **Comment and discuss** on posts
  - **Real-time chat** between members (WebSocket)
  - **Automated AI feedback**: AI analyzes and provides comments on your code when you post
  - **Search and categorize posts** by tags
  - **User authentication and management** (session-based)
  - **Modern interface** built with ReactJS

## 🖼️ Demo

Homepage:
\<img width="1315" height="628" alt="image" src="[https://github.com/user-attachments/assets/343c0054-5f61-4271-9938-4161d80511ca](https://github.com/user-attachments/assets/343c0054-5f61-4271-9938-4161d80511ca)" /\>

-----

## 🏗️ System Architecture

  - **Frontend:** ReactJS (Vite), communicating via REST API & WebSocket
  - **Backend:** Django, Django REST Framework, Django Channels (WebSocket)
  - **Database:** PostgreSQL
  - **Real-time/Cache:** Redis (for Django Channels)
  - **AI Service:** Integrated Google Gemini API for automated code feedback

## ⚡ Quick Start Guide

### 1\. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

### 2\. Run the Backend

```bash
cd backend
# Install required Python packages
pip install -r requirements.txt

# Run migrations and create a superuser if needed
python manage.py migrate
python manage.py createsuperuser

# Start the backend server
python manage.py runserver
```

Or a quicker way to run:

```bash
cd frontend
npm run dev
```

### 3\. Redis & WebSocket

Ensure Redis is running (default on localhost:6379)
WebSockets will work automatically once the backend and Redis are ready.

### 4\. AI Configuration (Gemini API)

Sign up and get an API key from Google Gemini.
Set the `GEMINI_API_KEY` environment variable for the backend.

-----

## 🛠️ Useful Commands

**Database Backup:**
Run the `backup_db.py` script or use `pg_dump`/`pg_restore` commands (see `backend/backup_db.py` for details).

## 📂 Project Structure

```bash
DevCove/
├── backend/
│   ├── manage.py
│   ├── devcove/          # Django config
│   ├── posts/            # Posts, comments API
│   ├── chat/             # WebSocket chat
│   ├── prompts.py        # AI prompts
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   └── ...
└── README.md
```

-----

## 📜 License

This is a non-commercial, academic project.
