import random
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from posts.models import Post, Tag, Community
from django.utils.text import slugify

# Mẫu code snippets phong phú và đa dạng cho từng ngôn ngữ
CODE_TEMPLATES = {
    'python': {
        'snippets': [
            {
                'title': 'Simple Greeting Function',
                'code': '''def greet(name, greeting="Hello"):
    """Return a personalized greeting."""
    return f"{greeting}, {name}!"

# Usage
print(greet("Alice"))
print(greet("Bob", "Hi"))''',
                'description': 'A simple function that creates personalized greetings with default parameters.'
            },
            {
                'title': 'Person Class with Properties',
                'code': '''class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age
    
    @property
    def is_adult(self):
        return self.age >= 18
    
    def __str__(self):
        return f"{self.name} ({self.age} years old)"

# Usage
person = Person("John", 25)
print(person.is_adult)  # True''',
                'description': 'A Person class demonstrating properties and magic methods.'
            },
            {
                'title': 'Circle Area Calculator',
                'code': '''import math

def calculate_circle_area(radius):
    """Calculate the area of a circle given its radius."""
    if radius < 0:
        raise ValueError("Radius cannot be negative")
    return math.pi * radius ** 2

# Usage
try:
    area = calculate_circle_area(5)
    print(f"Area: {area:.2f}")
except ValueError as e:
    print(f"Error: {e}")''',
                'description': 'Calculate circle area with error handling for invalid inputs.'
            },
            {
                'title': 'Most Common Elements',
                'code': '''from collections import Counter

def find_most_common(items, n=3):
    """Find the n most common elements in a list."""
    counter = Counter(items)
    return counter.most_common(n)

# Usage
data = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple']
common = find_most_common(data, 2)
print(common)  # [('apple', 3), ('banana', 2)]''',
                'description': 'Find the most frequently occurring elements in a collection.'
            },
            {
                'title': 'List Comprehension Examples',
                'code': '''# Filter and transform data
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

# Even squares
even_squares = [x**2 for x in numbers if x % 2 == 0]
print(even_squares)  # [4, 16, 36, 64, 100]

# Dictionary comprehension
word_lengths = {word: len(word) for word in ['python', 'java', 'go']}
print(word_lengths)  # {'python': 6, 'java': 4, 'go': 2}''',
                'description': 'Demonstrate list and dictionary comprehensions for data processing.'
            }
        ]
    },
    'javascript': {
        'snippets': [
            {
                'title': 'Arrow Function Greeting',
                'code': '''const greet = (name, greeting = "Hello") => `${greeting}, ${name}!`;

// Usage
console.log(greet("Alice"));        // Hello, Alice!
console.log(greet("Bob", "Hi"));    // Hi, Bob!

// Array of greetings
const names = ["John", "Jane", "Mike"];
const greetings = names.map(name => greet(name));
console.log(greetings);''',
                'description': 'Modern arrow function with default parameters and array mapping.'
            },
            {
                'title': 'ES6 Class with Methods',
                'code': '''class Person {
    constructor(name, age) {
        this.name = name;
        this.age = age;
    }
    
    get isAdult() {
        return this.age >= 18;
    }
    
    introduce() {
        return `Hi, I'm ${this.name} and I'm ${this.age} years old.`;
    }
}

// Usage
const person = new Person("Alice", 25);
console.log(person.introduce());
console.log(`Is adult: ${person.isAdult}`);''',
                'description': 'ES6 class with getter methods and proper encapsulation.'
            },
            {
                'title': 'Async API Call',
                'code': '''async function fetchUserData(userId) {
    try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const userData = await response.json();
        return userData;
    } catch (error) {
        console.error('Error fetching user data:', error);
        throw error;
    }
}

// Usage
fetchUserData(123)
    .then(user => console.log(user))
    .catch(error => console.log('Failed to load user'));''',
                'description': 'Modern async/await pattern for API calls with error handling.'
            },
            {
                'title': 'Array Methods Chain',
                'code': '''const products = [
    { name: 'Laptop', price: 1200, category: 'Electronics' },
    { name: 'Book', price: 15, category: 'Education' },
    { name: 'Phone', price: 800, category: 'Electronics' }
];

// Chain array methods
const expensiveElectronics = products
    .filter(p => p.category === 'Electronics')
    .filter(p => p.price > 900)
    .map(p => ({ ...p, discounted: p.price * 0.9 }));

console.log(expensiveElectronics);''',
                'description': 'Demonstrate method chaining with filter, map, and spread operator.'
            }
        ]
    },
    'html': {
        'snippets': [
            {
                'title': 'Modern HTML5 Structure',
                'code': '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modern Web Page</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header>
        <nav>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    
    <main>
        <section id="hero">
            <h1>Welcome to Our Site</h1>
            <p>This is a modern HTML5 structure example.</p>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2025 Our Company</p>
    </footer>
</body>
</html>''',
                'description': 'Complete HTML5 document structure with semantic elements.'
            },
            {
                'title': 'Contact Form',
                'code': '''<form action="/submit" method="POST" class="contact-form">
    <div class="form-group">
        <label for="name">Full Name:</label>
        <input type="text" id="name" name="name" required>
    </div>
    
    <div class="form-group">
        <label for="email">Email:</label>
        <input type="email" id="email" name="email" required>
    </div>
    
    <div class="form-group">
        <label for="message">Message:</label>
        <textarea id="message" name="message" rows="5" required></textarea>
    </div>
    
    <button type="submit" class="submit-btn">Send Message</button>
</form>''',
                'description': 'HTML form with proper labels, validation, and accessibility.'
            }
        ]
    },
    'css': {
        'snippets': [
            {
                'title': 'Modern CSS Grid Layout',
                'code': '''.container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 2rem;
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    padding: 1.5rem;
    transition: transform 0.2s ease;
}

.card:hover {
    transform: translateY(-5px);
}''',
                'description': 'Responsive grid layout with hover effects and modern styling.'
            },
            {
                'title': 'Flexbox Navigation',
                'code': '''.navbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.nav-links {
    display: flex;
    list-style: none;
    gap: 2rem;
    margin: 0;
    padding: 0;
}

.nav-links a {
    color: white;
    text-decoration: none;
    transition: opacity 0.3s ease;
}

.nav-links a:hover {
    opacity: 0.8;
}''',
                'description': 'Flexible navigation bar using CSS Flexbox and gradients.'
            }
        ]
    },
    'php': {
        'snippets': [
            {
                'title': 'User Authentication Class',
                'code': '''<?php
class UserAuth {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    public function login($email, $password) {
        $stmt = $this->db->prepare("SELECT id, password_hash FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            return true;
        }
        return false;
    }
    
    public function register($email, $password) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $this->db->prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)");
        return $stmt->execute([$email, $hash]);
    }
}
?>''',
                'description': 'PHP class for user authentication with prepared statements.'
            },
            {
                'title': 'Simple API Endpoint',
                'code': '''<?php
header('Content-Type: application/json');

function getUsers() {
    try {
        $pdo = new PDO("mysql:host=localhost;dbname=mydb", $user, $pass);
        $stmt = $pdo->query("SELECT id, name, email FROM users");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $users
        ]);
    } catch (PDOException $e) {
        echo json_encode([
            'success' => false,
            'error' => 'Database error'
        ]);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    getUsers();
}
?>''',
                'description': 'Simple REST API endpoint that returns user data as JSON.'
            }
        ]
    },
    'java': {
        'snippets': [
            {
                'title': 'Simple Calculator Class',
                'code': '''public class Calculator {
    public static double add(double a, double b) {
        return a + b;
    }
    
    public static double multiply(double a, double b) {
        return a * b;
    }
    
    public static void main(String[] args) {
        System.out.println("Addition: " + add(5.5, 3.2));
        System.out.println("Multiplication: " + multiply(4, 7));
        
        // Using lambda with streams
        java.util.List<Integer> numbers = java.util.List.of(1, 2, 3, 4, 5);
        int sum = numbers.stream()
                        .mapToInt(Integer::intValue)
                        .sum();
        System.out.println("Sum: " + sum);
    }
}''',
                'description': 'Java class with static methods and stream operations.'
            },
            {
                'title': 'Generic List Operations',
                'code': '''import java.util.*;
import java.util.stream.Collectors;

public class ListOperations {
    public static <T> List<T> removeDuplicates(List<T> list) {
        return list.stream()
                  .distinct()
                  .collect(Collectors.toList());
    }
    
    public static void main(String[] args) {
        List<String> fruits = Arrays.asList("apple", "banana", "apple", "orange");
        List<String> unique = removeDuplicates(fruits);
        
        unique.forEach(System.out::println);
        
        // Filter and collect
        List<String> longFruits = fruits.stream()
            .filter(fruit -> fruit.length() > 5)
            .collect(Collectors.toList());
        
        System.out.println("Long fruits: " + longFruits);
    }
}''',
                'description': 'Generic methods and stream operations for list processing.'
            }
        ]
    },
    'sql': {
        'snippets': [
            {
                'title': 'Advanced User Queries',
                'code': '''-- Get users with their post counts
SELECT u.id, u.name, u.email, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.author_id
WHERE u.active = 1
GROUP BY u.id, u.name, u.email
HAVING COUNT(p.id) > 0
ORDER BY post_count DESC;

-- Get top 5 most popular tags
SELECT t.name, COUNT(pt.post_id) as usage_count
FROM tags t
INNER JOIN post_tags pt ON t.id = pt.tag_id
GROUP BY t.id, t.name
ORDER BY usage_count DESC
LIMIT 5;''',
                'description': 'Complex SQL queries with JOINs, GROUP BY, and aggregations.'
            },
            {
                'title': 'Database Schema Creation',
                'code': '''-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create posts table with foreign key
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT,
    author_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better performance
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_published ON posts(published);''',
                'description': 'Complete database schema with relationships and indexes.'
            }
        ]
    },
    'rust': {
        'snippets': [
            {
                'title': 'Safe Vector Operations',
                'code': '''fn main() {
    let mut numbers = vec![1, 2, 3, 4, 5];
    
    // Safe iteration and transformation
    let doubled: Vec<i32> = numbers
        .iter()
        .map(|x| x * 2)
        .collect();
    
    println!("Original: {:?}", numbers);
    println!("Doubled: {:?}", doubled);
    
    // Safe indexing with pattern matching
    match numbers.get(10) {
        Some(value) => println!("Value at index 10: {}", value),
        None => println!("Index 10 is out of bounds"),
    }
    
    // Filter and collect
    let evens: Vec<i32> = numbers
        .into_iter()
        .filter(|&x| x % 2 == 0)
        .collect();
    
    println!("Even numbers: {:?}", evens);
}''',
                'description': 'Demonstrate Rust\'s safe memory management and iterators.'
            }
        ]
    },
    'go': {
        'snippets': [
            {
                'title': 'HTTP Server with JSON',
                'code': '''package main

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    users := []User{
        {ID: 1, Name: "John Doe", Email: "john@example.com"},
        {ID: 2, Name: "Jane Smith", Email: "jane@example.com"},
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func main() {
    http.HandleFunc("/users", usersHandler)
    fmt.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}''',
                'description': 'Simple HTTP server in Go that serves JSON data.'
            }
        ]
    }
}

class Command(BaseCommand):
    help = 'Tự động tạo post với content là code snippets đa dạng, tự động tạo tag tương ứng với ngôn ngữ.'

    def add_arguments(self, parser):
        parser.add_argument('--count', '-c', type=int, default=30, help='Số lượng bài viết (mặc định: 30)')
        parser.add_argument('--language', '-l', type=str, help='Chỉ tạo post cho ngôn ngữ cụ thể')
        parser.add_argument('--yes', '-y', action='store_true', help='Bỏ qua xác nhận')

    def handle(self, *args, **options):
        User = get_user_model()
        count = options['count']
        target_language = options.get('language')
        
        # Validate language if specified
        if target_language and target_language not in CODE_TEMPLATES:
            available_langs = ', '.join(CODE_TEMPLATES.keys())
            self.stdout.write(
                self.style.ERROR(f'Ngôn ngữ "{target_language}" không hợp lệ. '
                                f'Các ngôn ngữ có sẵn: {available_langs}')
            )
            return

        communities = list(Community.objects.all())
        authors = list(User.objects.filter(is_active=True))
        
        if not authors:
            self.stdout.write(self.style.ERROR('Không tìm thấy tác giả nào đang hoạt động.'))
            return

        if not options['yes']:
            lang_info = f' cho ngôn ngữ {target_language}' if target_language else ''
            confirm = input(f"Xác nhận tạo {count} bài viết code snippet{lang_info}? [y/N]: ")
            if confirm.lower() != 'y':
                self.stdout.write(self.style.ERROR('Đã hủy tạo bài viết.'))
                return

        # Chuẩn bị danh sách ngôn ngữ sẽ sử dụng
        languages_to_use = [target_language] if target_language else list(CODE_TEMPLATES.keys())
        
        # Tạo tất cả tags cần thiết trước khi tạo posts
        self.stdout.write('Đang chuẩn bị tags...')
        created_tags = {}
        for language in languages_to_use:
            tag_name = language.upper() if language in ['php', 'css', 'sql'] else language.capitalize()
            tag_slug = slugify(tag_name)
            
            # Tìm tag existing hoặc tạo mới
            try:
                tag = Tag.objects.get(slug=tag_slug)
                created_tags[language] = tag
            except Tag.DoesNotExist:
                try:
                    tag = Tag.objects.create(name=tag_name, slug=tag_slug)
                    created_tags[language] = tag
                    self.stdout.write(f'Đã tạo tag mới: {tag_name}')
                except Exception as e:
                    # Nếu vẫn lỗi (có thể do race condition), thử get lại
                    try:
                        tag = Tag.objects.get(slug=tag_slug)
                        created_tags[language] = tag
                    except Tag.DoesNotExist:
                        self.stdout.write(
                            self.style.ERROR(f'Không thể tạo tag cho {language}: {str(e)}')
                        )
                        continue
        
        self.stdout.write(f'Đã chuẩn bị {len(created_tags)} tags. Bắt đầu tạo posts...')
        
        created = 0
        
        for i in range(count):
            try:
                # Chọn ngôn ngữ từ danh sách có sẵn tags
                available_languages = list(created_tags.keys())
                if not available_languages:
                    self.stdout.write(self.style.ERROR('Không có tag nào có sẵn để tạo posts.'))
                    break
                    
                language = random.choice(available_languages)
                language_data = CODE_TEMPLATES[language]
                
                # Chọn snippet ngẫu nhiên
                snippet_data = random.choice(language_data['snippets'])
                
                # Lấy tag đã được tạo trước đó
                tag = created_tags[language]
                
                # Chọn tác giả và community ngẫu nhiên
                author = random.choice(authors)
                community = random.choice(communities) if communities else None
                
                # Tạo title và content
                title = f"{snippet_data['title']} - {tag.name}"
                content = f"{snippet_data['description']}\n\n```{language}\n{snippet_data['code']}\n```"
                
                # Tạo post
                post = Post.objects.create(
                    title=title,
                    content=content,
                    author=author,
                    community=community
                )
                
                # Gán tag
                post.tags.add(tag)
                
                # Tạo slug
                post.slug = slugify(title)[:50]
                if not post.slug:  # Fallback nếu slug rỗng
                    post.slug = f"post-{post.id}"
                
                post.save()
                created += 1
                
                # In progress mỗi 10 bài
                if created % 10 == 0:
                    self.stdout.write(f'Đã tạo {created}/{count} bài viết...')
                    
            except Exception as e:
                self.stdout.write(
                    self.style.WARNING(f'Lỗi khi tạo bài viết {i+1}: {str(e)}')
                )
                continue

        # Tổng kết
        self.stdout.write(
            self.style.SUCCESS(
                f'Hoàn thành! Đã tạo {created}/{count} bài viết code snippet.'
            )
        )
        
        # Thống kê tag đã sử dụng
        if created > 0:
            self.stdout.write(f'Số lượng tag được sử dụng: {len(created_tags)}')