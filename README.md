# Full Stack Task Manager API

Express.js + Node.js + MongoDB REST API backend for ITUE301 Advanced Web Development Framework (AWDF) Practical 6.

## Student Details
- **Student Name**: Prisha Kalola
- **Student ID**: 24DIT026
- **Semester**: 5th Semester

## Technology Stack
- Node.js & Express.js
- MongoDB & Mongoose
- CORS Middleware (`cors`)
- Dotenv (`dotenv`)

## Features & Endpoints
- `GET /tasks` - Retrieve all tasks from MongoDB
- `POST /tasks` - Create a new task (`title`, `description`, `priority`)
- `GET /tasks/:id` - Fetch single task details
- `PUT /tasks/:id` - Update task status (`completed`, `title`, `description`)
- `DELETE /tasks/:id` - Remove task document from database

## Setup & Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the root directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/taskDB
   PORT=5000
   ```

3. Start the Express server:
   ```bash
   npm start
   ```
   The backend server will run on `http://localhost:5000`.
