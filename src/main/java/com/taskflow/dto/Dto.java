package com.taskflow.dto;

import com.taskflow.model.Comment;
import com.taskflow.model.Task;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class Dto {

    // ── Auth Requests ─────────────────────────────────────────
    public static class RegisterRequest {
        @NotBlank @Size(min = 2, max = 100) public String name;
        @NotBlank @Email                    public String email;
        @NotBlank @Size(min = 8)            public String password;
    }

    public static class LoginRequest {
        @NotBlank @Email public String email;
        @NotBlank        public String password;
    }

    // ── Auth Response ─────────────────────────────────────────
    public static class AuthResponse {
        public String token;
        public Long   userId;
        public String name;
        public String email;

        public AuthResponse(String token, Long userId, String name, String email) {
            this.token  = token;
            this.userId = userId;
            this.name   = name;
            this.email  = email;
        }
    }

    // ── Task Request ──────────────────────────────────────────
    public static class TaskRequest {
        @NotBlank public String title;
        public String        description;
        public Task.Status   status;
        public Task.Priority priority;
        public LocalDate     dueDate;
        public String        project;
        public String        assignee;
        public String        tags;
    }

    // ── Task Response ─────────────────────────────────────────
    public static class TaskResponse {
        public Long              id;
        public String            title;
        public String            description;
        public String            status;
        public String            priority;
        public LocalDate         dueDate;
        public String            project;
        public String            assignee;
        public String            tags;
        public boolean           done;
        public LocalDateTime     createdAt;
        public LocalDateTime     updatedAt;
        public int               commentCount;
        public List<CommentResponse> comments;

        public static TaskResponse from(Task t) {
            TaskResponse r   = new TaskResponse();
            r.id             = t.getId();
            r.title          = t.getTitle();
            r.description    = t.getDescription();
            r.status         = t.getStatus()   != null ? t.getStatus().name()   : "TODO";
            r.priority       = t.getPriority() != null ? t.getPriority().name() : "MEDIUM";
            r.dueDate        = t.getDueDate();
            r.project        = t.getProject();
            r.assignee       = t.getAssignee();
            r.tags           = t.getTags();
            r.done           = t.isDone();
            r.createdAt      = t.getCreatedAt();
            r.updatedAt      = t.getUpdatedAt();
            if (t.getComments() != null) {
                r.comments     = t.getComments().stream().map(CommentResponse::from).collect(Collectors.toList());
                r.commentCount = r.comments.size();
            } else {
                r.commentCount = 0;
            }
            return r;
        }
    }

    // ── Comment Request ───────────────────────────────────────
    public static class CommentRequest {
        @NotBlank public String text;
    }

    // ── Comment Response ──────────────────────────────────────
    public static class CommentResponse {
        public Long          id;
        public String        text;
        public String        author;
        public LocalDateTime createdAt;

        public static CommentResponse from(Comment c) {
            CommentResponse r = new CommentResponse();
            r.id        = c.getId();
            r.text      = c.getText();
            r.author    = c.getAuthor();
            r.createdAt = c.getCreatedAt();
            return r;
        }
    }

    // ── Stats Response ────────────────────────────────────────
    public static class StatsResponse {
        public long total;
        public long done;
        public long todo;
        public long inProgress;
        public long review;
        public long high;
        public long medium;
        public long low;
        public long overdue;
    }

    // ── Message Response ──────────────────────────────────────
    public static class MessageResponse {
        public String message;
        public MessageResponse(String message) { this.message = message; }
    }
}
