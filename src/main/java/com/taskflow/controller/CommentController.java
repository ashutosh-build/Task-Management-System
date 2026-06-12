package com.taskflow.controller;

import com.taskflow.dto.Dto.CommentRequest;
import com.taskflow.dto.Dto.CommentResponse;
import com.taskflow.dto.Dto.MessageResponse;
import com.taskflow.model.Comment;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.JwtUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks/{taskId}/comments")
public class CommentController {

    private final TaskRepository    taskRepository;
    private final CommentRepository commentRepository;
    private final UserRepository    userRepository;
    private final JwtUtil           jwtUtil;

    public CommentController(TaskRepository taskRepository,
                              CommentRepository commentRepository,
                              UserRepository userRepository,
                              JwtUtil jwtUtil) {
        this.taskRepository    = taskRepository;
        this.commentRepository = commentRepository;
        this.userRepository    = userRepository;
        this.jwtUtil           = jwtUtil;
    }

    private Long getUserId(HttpServletRequest request) {
        String token = request.getHeader("Authorization").substring(7);
        return jwtUtil.extractUserId(token);
    }

    @GetMapping
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long taskId,
                                                              HttpServletRequest request) {
        Long uid = getUserId(request);
        if (taskRepository.findByIdAndUserId(taskId, uid).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        List<CommentResponse> list = commentRepository
                .findByTaskIdOrderByCreatedAtAsc(taskId)
                .stream()
                .map(CommentResponse::from)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long taskId,
                                                       @Valid @RequestBody CommentRequest body,
                                                       HttpServletRequest request) {
        Long uid = getUserId(request);
        return taskRepository.findByIdAndUserId(taskId, uid).map(task -> {
            String author = userRepository.findById(uid)
                    .map(com.taskflow.model.User::getName)
                    .orElse("User");
            Comment comment = new Comment(body.text.trim(), author, task);
            comment = commentRepository.save(comment);
            return ResponseEntity.ok(CommentResponse.from(comment));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<MessageResponse> deleteComment(@PathVariable Long taskId,
                                                          @PathVariable Long commentId,
                                                          HttpServletRequest request) {
        Long uid = getUserId(request);
        if (taskRepository.findByIdAndUserId(taskId, uid).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        if (!commentRepository.existsById(commentId)) {
            return ResponseEntity.notFound().build();
        }
        commentRepository.deleteById(commentId);
        return ResponseEntity.ok(new MessageResponse("Comment deleted."));
    }
}
