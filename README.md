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
<img width="1315" height="628" alt="image" src="https://github.com/user-attachments/assets/343c0054-5f61-4271-9938-4161d80511ca" />

-----

## 🏗️ System Architecture

  - **Frontend:** ReactJS (Vite), communicating via REST API & WebSocket  
  - **Backend:** Django, Django REST Framework, Django Channels (WebSocket)  
  - **Database:** PostgreSQL  
  - **Real-time/Cache:** Redis (for Django Channels)  
  - **AI Service:** Integrated Google Gemini API for automated features  

-----

## ⚡ Quick Start Guide

### 1️⃣ Requirements
Make sure the following are installed before running the project:
- **Python 3.10+**
- **Node.js 18+**
- **PostgreSQL 15+**
- **Redis** (for WebSocket communication)
- **npm** or **yarn**

-----

### 2️⃣ Backend Setup

#### Step 1 — Create and Restore the Database
A PostgreSQL dump file named **`devcove_dump.sql`** is already included inside the `backend/` folder.  
You can use this file to quickly restore both the database structure and example data.

Follow these steps:

```bash
# 1️⃣ Create a new PostgreSQL database
createdb devcove

# 2️⃣ Restore the database from the included dump file
psql -U postgres -d devcove -f backend/devcove_dump.sql
````

💡 Tip:
Make sure PostgreSQL is installed and running before executing the commands.
If your PostgreSQL user requires a password, you may be prompted to enter it.
You can also open pgAdmin → Query Tool → and run the contents of devcove_dump.sql manually.
Once completed successfully, the database will contain all the required tables and sample records for testing.

If you encounter connection issues:
Ensure your PostgreSQL service is running on localhost:5432
Verify that the database name, username, and password match the configuration in backend/settings.py or .env


---

#### Step 2 — Environment Configuration

Open `backend/.env` and insert your **Gemini API key**:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```

If you don’t have one, get a free key at:
👉 [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

---

#### Step 3 — Install and Run the Backend

```bash
cd backend
pip install -r requirements.txt

# Run migrations and create a superuser (if needed)
python manage.py migrate
python manage.py createsuperuser

# Start the Django server
python manage.py runserver
```

Backend will be available at:
**[http://localhost:8000](http://localhost:8000)**

---

### 3️⃣ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on:
**[http://localhost:3000](http://localhost:3000)**

---

### 4️⃣ Redis & WebSocket

Ensure Redis is running (default: `localhost:6379`).
Once Redis and the backend are running, real-time chat and notifications will work automatically.

---

### 5️⃣ AI Configuration (Gemini)

Some AI-powered features (e.g., automatic feedback on code posts) require a **Google Gemini API key**.
If the key is missing or invalid, the system will show:

> “AI feature unavailable — please provide a valid Gemini API key.”

---

## 🧩 Project Structure

```bash
DevCove/
├── backend/
│   ├── manage.py
│   ├── devcove_backup.dump     # PostgreSQL dump file
│   ├── .env.example            # Example environment config
│   ├── devcove/                # Django settings
│   ├── posts/                  # Posts, comments API
│   ├── chat/                   # WebSocket chat
│   ├── prompts.py              # AI prompt handlers
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   └── ...
│   └── ...
└── README.md
```

---

## 🛠️ Useful Commands

### Database Backup


```bash
# Backup
pg_dump -U postgres -d DevCove -f backup.sql OR run backend\backup_db.py

# Restore
pg_restore -h localhost -p 5432 -U postgres -d DevCove -v --clean "full_path_to_file.dump"
```

---

## 👤 Test Accounts

| Role  | Username | Password |
| ----- | -------- | -------- |
| Admin | admin    | 1        |
| User  | tb       | 1        |

You can change password and rule of an user in [Django Admin](http://127.0.0.1:8000/admin)
---

## 📜 License

This is a non-commercial, academic project created for educational purposes.

---

## ⚠️ Note
This project requires a Google Gemini API key for AI features.
For grading purposes, a demo key is provided inside the `.env` file 
(in the ZIP submission only).

If the key quota is exceeded, instructors may create their own free key at:
https://aistudio.google.com/app/apikey
and replace it in `backend/.env` as follows:

`GEMINI_API_KEY="YOUR_NEW_KEY_HERE"`