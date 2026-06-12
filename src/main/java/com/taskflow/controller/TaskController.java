package com.taskflow.controller;

import com.taskflow.dto.Dto.*;
import com.taskflow.model.Task;
import com.taskflow.model.Task.Priority;
import com.taskflow.model.Task.Status;
import com.taskflow.model.User;
import com.taskflow.repository.TaskRepository;
import com.taskflow.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskRepository taskRepository;
    private final JwtUtil        jwtUtil;

    public TaskController(TaskRepository taskRepository, JwtUtil jwtUtil) {
        this.taskRepository = taskRepository;
        this.jwtUtil        = jwtUtil;
    }

    private Long getUserId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.extractUserId(token);
    }

    // ── GET all tasks ─────────────────────────────────────────
    @GetMapping
    public ResponseEntity<List<TaskResponse>> getAll(
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String project,
            HttpServletRequest request) {

        Long uid = getUserId(request);
        LocalDate today = LocalDate.now();
        List<Task> tasks;

        if ("today".equals(filter)) {
            tasks = taskRepository.findTodayTasks(uid, today);
        } else if ("upcoming".equals(filter)) {
            tasks = taskRepository.findUpcomingTasks(uid, today);
        } else if ("done".equals(filter)) {
            tasks = taskRepository.findCompletedTasks(uid);
        } else if (project != null && !project.isEmpty()) {
            tasks = taskRepository.findByUserIdAndProject(uid, project);
        } else {
            tasks = taskRepository.findAllByUserIdWithComments(uid);
        }

        return ResponseEntity.ok(
                tasks.stream().map(TaskResponse::from).collect(Collectors.toList())
        );
    }

    // ── GET single task ───────────────────────────────────────
    @GetMapping("/{id}")
    public ResponseEntity<TaskResponse> getOne(@PathVariable Long id,
                                                HttpServletRequest request) {
        Long uid = getUserId(request);
        return taskRepository.findByIdAndUserIdWithComments(id, uid)
                .map(t -> ResponseEntity.ok(TaskResponse.from(t)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ── GET stats ─────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<StatsResponse> getStats(HttpServletRequest request) {
        Long uid    = getUserId(request);
        LocalDate today = LocalDate.now();

        StatsResponse stats = new StatsResponse();
        stats.total      = taskRepository.countByUserId(uid);
        stats.done       = taskRepository.countByUserIdAndDoneTrue(uid);
        stats.todo       = taskRepository.countByUserIdAndStatus(uid, Status.TODO);
        stats.inProgress = taskRepository.countByUserIdAndStatus(uid, Status.INPROGRESS);
        stats.review     = taskRepository.countByUserIdAndStatus(uid, Status.REVIEW);
        stats.high       = taskRepository.countByUserIdAndPriority(uid, Priority.HIGH);
        stats.medium     = taskRepository.countByUserIdAndPriority(uid, Priority.MEDIUM);
        stats.low        = taskRepository.countByUserIdAndPriority(uid, Priority.LOW);
        stats.overdue    = taskRepository.countOverdue(uid, today);

        return ResponseEntity.ok(stats);
    }

    // ── POST create task ──────────────────────────────────────
    @PostMapping
    public ResponseEntity<TaskResponse> create(@Valid @RequestBody TaskRequest body,
                                                HttpServletRequest request) {
        Long uid  = getUserId(request);
        User user = new User();
        user.setId(uid);

        Task task = new Task();
        task.setTitle(body.title.trim());
        task.setDescription(body.description);
        task.setStatus(body.status   != null ? body.status   : Status.TODO);
        task.setPriority(body.priority != null ? body.priority : Priority.MEDIUM);
        task.setDueDate(body.dueDate);
        task.setProject(body.project);
        task.setAssignee(body.assignee);
        task.setTags(body.tags);
        task.setDone(Status.DONE.equals(task.getStatus()));
        task.setUser(user);

        task = taskRepository.save(task);
        return ResponseEntity.ok(TaskResponse.from(task));
    }

    // ── PUT update task ───────────────────────────────────────
    @PutMapping("/{id}")
    public ResponseEntity<TaskResponse> update(@PathVariable Long id,
                                                @Valid @RequestBody TaskRequest body,
                                                HttpServletRequest request) {
        Long uid = getUserId(request);
        return taskRepository.findByIdAndUserId(id, uid).map(task -> {
            task.setTitle(body.title.trim());
            task.setDescription(body.description);
            if (body.status   != null) task.setStatus(body.status);
            if (body.priority != null) task.setPriority(body.priority);
            task.setDueDate(body.dueDate);
            task.setProject(body.project);
            task.setAssignee(body.assignee);
            task.setTags(body.tags);
            task.setDone(Status.DONE.equals(task.getStatus()));
            return ResponseEntity.ok(TaskResponse.from(taskRepository.save(task)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── PATCH toggle done ─────────────────────────────────────
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<TaskResponse> toggle(@PathVariable Long id,
                                                HttpServletRequest request) {
        Long uid = getUserId(request);
        return taskRepository.findByIdAndUserId(id, uid).map(task -> {
            boolean nowDone = !task.isDone();
            task.setDone(nowDone);
            if (nowDone) {
                task.setStatus(Status.DONE);
            } else if (Status.DONE.equals(task.getStatus())) {
                task.setStatus(Status.TODO);
            }
            return ResponseEntity.ok(TaskResponse.from(taskRepository.save(task)));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── PATCH move task (kanban drag-drop) ────────────────────
    @PatchMapping("/{id}/move")
    public ResponseEntity<TaskResponse> move(@PathVariable Long id,
                                              @RequestParam String status,
                                              HttpServletRequest request) {
        Long uid = getUserId(request);
        return taskRepository.findByIdAndUserId(id, uid).map(task -> {
            try {
                Status newStatus = Status.valueOf(status.toUpperCase());
                task.setStatus(newStatus);
                task.setDone(Status.DONE.equals(newStatus));
                return ResponseEntity.ok(TaskResponse.from(taskRepository.save(task)));
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().<TaskResponse>build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE task ───────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> delete(@PathVariable Long id,
                                                   HttpServletRequest request) {
        Long uid = getUserId(request);
        return taskRepository.findByIdAndUserId(id, uid).map(task -> {
            taskRepository.delete(task);
            return ResponseEntity.ok(new MessageResponse("Task deleted successfully."));
        }).orElse(ResponseEntity.notFound().build());
    }
}
