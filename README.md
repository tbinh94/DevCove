# 🔥 Reddit Clone

A full-stack Reddit Clone built using **Python Django** for the backend and **HTML5/CSS3/JavaScript** for the frontend.  
It allows users to register, log in, create posts, upvote/downvote, and interact in subreddit-style communities.

---

## 🛠 Features

- 🔐 User Authentication (Register / Login / Logout)
- 📝 Create / Edit / Delete Posts
- 🖼 Upload Images to Posts
- 🏷 Tagging System (like Subreddits)
- 📄 Post Listing by Tags or All
- 🔺 Upvote / 🔻 Downvote Posts
- 💬 Comment on Posts (optional, if implemented)
- 📱 Responsive Frontend using HTML5/CSS3/JS

---

## 🧰 Tech Stack

- **Backend**: Django (Python)
- **Frontend**: HTML5, CSS3, JavaScript
- **Database**: SQLite (default, can switch to PostgreSQL/MySQL)
- **Template Engine**: Django Templates
- **Others**

Run the server
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py runserver
Access at: http://127.0.0.1:8000/

📂 **Project Structured:**
reddit-clone/
├── static/
├── templates/
│   ├── base.html
│   ├── post_list.html
│   └── ...
├── posts/
│   ├── models.py
│   ├── views.py
│   ├── urls.py
│   └── ...
├── reddit_clone/ (project settings)
│   └── settings.py
└── manage.py

🧪 Demo
![image](https://github.com/user-attachments/assets/ad95c821-8fad-4034-9e22-91d9cf576c1c)
![image](https://github.com/user-attachments/assets/01d2f1df-ceae-4ba3-86b2-11da046fe604)
![image](https://github.com/user-attachments/assets/fb55e1a8-1817-4e22-8200-58d95d509875)


