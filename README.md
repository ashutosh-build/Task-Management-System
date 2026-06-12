Task Management System

A Task Management System built using Spring Boot and MongoDB that helps users create, manage, update, and track tasks efficiently. The application provides task prioritization, status tracking, and a clean RESTful API for task management.

Features
Create new tasks
View all tasks
Update existing tasks
Delete tasks
Track task status
Set task priorities
RESTful API architecture
MongoDB database integration
Tech Stack
Java
Spring Boot
Spring Data MongoDB
MongoDB
Maven
Git & GitHub
Project Structure
src/
 ├── main/
 │   ├── java/
 │   │   ├── controller/
 │   │   ├── service/
 │   │   ├── repository/
 │   │   ├── model/
 │   │   └── exception/
 │   └── resources/
 │       └── application.properties
 └── test/
API Endpoints
Method	Endpoint	Description
POST	/tasks	Create a task
GET	/tasks	Get all tasks
GET	/tasks/{id}	Get task by ID
PUT	/tasks/{id}	Update task
DELETE	/tasks/{id}	Delete task# Task-Management-System
A Task Management System is a web-based application designed to help users organize, track, and manage their daily tasks efficiently. The system allows users to create, update, delete, and prioritize tasks while monitoring their progress. It provides a user-friendly interface for task scheduling, status tracking, and productivity management.
