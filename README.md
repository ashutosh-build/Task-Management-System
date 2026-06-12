# ✦ Taskflow — Spring Boot Task Manager

Full-stack task management app: **Java 21 + Spring Boot 3 + Spring Security + JWT + H2 + Vanilla JS**

## Quick Start

### Requirements
- Java 21+
- Maven 3.8+

### Run
```bash
cd taskflow-spring
mvn spring-boot:run
```
Open **http://localhost:8080**

**Demo login:** `demo@taskflow.app` / `demo1234`

### Build JAR
```bash
mvn clean package -DskipTests
java -jar target/taskflow-1.0.0.jar
```

## Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/taskflow-spring.git
git push -u origin main
```

## API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | /api/auth/register | Register |
| POST | /api/auth/login | Login → JWT |
| GET | /api/tasks | All tasks |
| GET | /api/tasks/stats | Statistics |
| POST | /api/tasks | Create task |
| PUT | /api/tasks/{id} | Update task |
| PATCH | /api/tasks/{id}/toggle | Toggle done |
| PATCH | /api/tasks/{id}/move?status= | Kanban move |
| DELETE | /api/tasks/{id} | Delete task |
| POST | /api/tasks/{id}/comments | Add comment |

H2 Console: http://localhost:8080/h2-console (JDBC: `jdbc:h2:mem:taskflowdb`)
