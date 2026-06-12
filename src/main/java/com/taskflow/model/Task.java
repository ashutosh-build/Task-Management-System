package com.taskflow.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tasks")
public class Task {

    public enum Status   { TODO, INPROGRESS, REVIEW, DONE }
    public enum Priority { HIGH, MEDIUM, LOW }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.TODO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priority priority = Priority.MEDIUM;

    @Column(name = "due_date")
    private LocalDate dueDate;

    private String project;
    private String assignee;
    private String tags;

    @Column(nullable = false)
    private boolean done = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<Comment> comments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.status == null)   this.status   = Status.TODO;
        if (this.priority == null) this.priority = Priority.MEDIUM;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // ── Constructors ──────────────────────────────────────────
    public Task() {}

    // ── Getters & Setters ─────────────────────────────────────
    public Long getId()                        { return id; }
    public void setId(Long id)                 { this.id = id; }

    public String getTitle()                   { return title; }
    public void setTitle(String title)         { this.title = title; }

    public String getDescription()             { return description; }
    public void setDescription(String d)       { this.description = d; }

    public Status getStatus()                  { return status; }
    public void setStatus(Status status)       { this.status = status; }

    public Priority getPriority()              { return priority; }
    public void setPriority(Priority priority) { this.priority = priority; }

    public LocalDate getDueDate()              { return dueDate; }
    public void setDueDate(LocalDate dueDate)  { this.dueDate = dueDate; }

    public String getProject()                 { return project; }
    public void setProject(String project)     { this.project = project; }

    public String getAssignee()                { return assignee; }
    public void setAssignee(String assignee)   { this.assignee = assignee; }

    public String getTags()                    { return tags; }
    public void setTags(String tags)           { this.tags = tags; }

    public boolean isDone()                    { return done; }
    public void setDone(boolean done)          { this.done = done; }

    public LocalDateTime getCreatedAt()        { return createdAt; }
    public void setCreatedAt(LocalDateTime t)  { this.createdAt = t; }

    public LocalDateTime getUpdatedAt()        { return updatedAt; }
    public void setUpdatedAt(LocalDateTime t)  { this.updatedAt = t; }

    public User getUser()                      { return user; }
    public void setUser(User user)             { this.user = user; }

    public List<Comment> getComments()         { return comments; }
    public void setComments(List<Comment> c)   { this.comments = c; }
}
