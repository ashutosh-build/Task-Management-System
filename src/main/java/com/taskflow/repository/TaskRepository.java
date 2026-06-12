package com.taskflow.repository;

import com.taskflow.model.Task;
import com.taskflow.model.Task.Status;
import com.taskflow.model.Task.Priority;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.user.id = :uid ORDER BY t.createdAt DESC")
    List<Task> findAllByUserIdWithComments(@Param("uid") Long userId);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.id = :id AND t.user.id = :uid")
    Optional<Task> findByIdAndUserIdWithComments(@Param("id") Long id, @Param("uid") Long userId);

    Optional<Task> findByIdAndUserId(Long id, Long userId);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.user.id = :uid AND t.dueDate = :date ORDER BY t.createdAt DESC")
    List<Task> findTodayTasks(@Param("uid") Long userId, @Param("date") LocalDate date);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.user.id = :uid AND t.dueDate > :today AND t.done = false ORDER BY t.dueDate ASC")
    List<Task> findUpcomingTasks(@Param("uid") Long userId, @Param("today") LocalDate today);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.user.id = :uid AND t.done = true ORDER BY t.updatedAt DESC")
    List<Task> findCompletedTasks(@Param("uid") Long userId);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.user.id = :uid AND t.project = :project ORDER BY t.createdAt DESC")
    List<Task> findByUserIdAndProject(@Param("uid") Long userId, @Param("project") String project);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.comments WHERE t.user.id = :uid AND t.priority = :priority ORDER BY t.createdAt DESC")
    List<Task> findByUserIdAndPriority(@Param("uid") Long userId, @Param("priority") Priority priority);

    // Stats
    long countByUserId(Long userId);
    long countByUserIdAndDoneTrue(Long userId);
    long countByUserIdAndStatus(Long userId, Status status);
    long countByUserIdAndPriority(Long userId, Priority priority);

    @Query("SELECT COUNT(t) FROM Task t WHERE t.user.id = :uid AND t.dueDate < :today AND t.done = false")
    long countOverdue(@Param("uid") Long userId, @Param("today") LocalDate today);
}
