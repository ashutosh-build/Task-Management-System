package com.taskflow.config;

import com.taskflow.model.Comment;
import com.taskflow.model.Task;
import com.taskflow.model.Task.Priority;
import com.taskflow.model.Task.Status;
import com.taskflow.model.User;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;

@Configuration
public class DataSeeder {

    @Bean
    public CommandLineRunner seedData(UserRepository    userRepo,
                                      TaskRepository    taskRepo,
                                      CommentRepository commentRepo,
                                      PasswordEncoder   encoder) {
        return args -> {
            if (userRepo.count() > 0) return;

            // ── Users ────────────────────────────────────────────
            User jane = new User("Jane Doe", "demo@taskflow.app",  encoder.encode("demo1234"));
            User alex = new User("Alex Chen","admin@taskflow.app", encoder.encode("admin123"));
            jane = userRepo.save(jane);
            alex = userRepo.save(alex);

            LocalDate today = LocalDate.now();

            // ── Tasks for Jane ───────────────────────────────────
            Task t1 = new Task();
            t1.setTitle("Redesign hero section");
            t1.setDescription("Update visual hierarchy with new illustrations and improve CTA placement.");
            t1.setStatus(Status.INPROGRESS); t1.setPriority(Priority.HIGH);
            t1.setDueDate(today.plusDays(4));
            t1.setProject("Design"); t1.setAssignee("Alice"); t1.setTags("ui,design");
            t1.setUser(jane); t1 = taskRepo.save(t1);

            Task t2 = new Task();
            t2.setTitle("Set up CI/CD pipeline");
            t2.setDescription("Configure GitHub Actions for automated staging deployments.");
            t2.setStatus(Status.TODO); t2.setPriority(Priority.HIGH);
            t2.setDueDate(today.plusDays(2));
            t2.setProject("Engineering"); t2.setAssignee("Bob"); t2.setTags("devops");
            t2.setUser(jane); t2 = taskRepo.save(t2);

            Task t3 = new Task();
            t3.setTitle("Q2 performance report");
            t3.setDescription("Summarize team metrics and present KPIs to stakeholders.");
            t3.setStatus(Status.REVIEW); t3.setPriority(Priority.MEDIUM);
            t3.setDueDate(today.plusDays(9));
            t3.setProject("Marketing"); t3.setAssignee("Jane"); t3.setTags("report");
            t3.setUser(jane); t3 = taskRepo.save(t3);

            Task t4 = new Task();
            t4.setTitle("Fix mobile nav bug");
            t4.setDescription("Nav drawer overlaps content on iOS Safari — urgent fix needed.");
            t4.setStatus(Status.TODO); t4.setPriority(Priority.MEDIUM);
            t4.setDueDate(today.minusDays(1));
            t4.setProject("Engineering"); t4.setAssignee("Jane"); t4.setTags("bug,mobile");
            t4.setUser(jane); t4 = taskRepo.save(t4);

            Task t5 = new Task();
            t5.setTitle("Social media launch assets");
            t5.setDescription("Design 5 post variants for Instagram and Twitter campaign.");
            t5.setStatus(Status.DONE); t5.setPriority(Priority.LOW);
            t5.setDueDate(today.minusDays(3)); t5.setDone(true);
            t5.setProject("Marketing"); t5.setAssignee("Carol"); t5.setTags("social,design");
            t5.setUser(jane); t5 = taskRepo.save(t5);

            Task t6 = new Task();
            t6.setTitle("Update design system tokens");
            t6.setDescription("Migrate color variables to new naming convention per brand guide.");
            t6.setStatus(Status.INPROGRESS); t6.setPriority(Priority.MEDIUM);
            t6.setDueDate(today.plusDays(6));
            t6.setProject("Design"); t6.setAssignee("Alice"); t6.setTags("tokens,design");
            t6.setUser(jane); t6 = taskRepo.save(t6);

            Task t7 = new Task();
            t7.setTitle("API rate limiting");
            t7.setDescription("Add Redis-backed rate limiting to all auth endpoints.");
            t7.setStatus(Status.TODO); t7.setPriority(Priority.HIGH);
            t7.setDueDate(today.plusDays(3));
            t7.setProject("Engineering"); t7.setAssignee("Bob"); t7.setTags("security,api");
            t7.setUser(jane); t7 = taskRepo.save(t7);

            Task t8 = new Task();
            t8.setTitle("Onboarding email sequence");
            t8.setDescription("5-email drip campaign for new user signups.");
            t8.setStatus(Status.DONE); t8.setPriority(Priority.LOW);
            t8.setDueDate(today.minusDays(8)); t8.setDone(true);
            t8.setProject("Marketing"); t8.setAssignee("Jane"); t8.setTags("email");
            t8.setUser(jane); t8 = taskRepo.save(t8);

            // ── Comments ─────────────────────────────────────────
            commentRepo.save(new Comment("Started working on the mockups!", "Alice", t1));
            commentRepo.save(new Comment("Looks great so far, keep going 👍", "Jane",  t1));
            commentRepo.save(new Comment("Need the conversion numbers as well.", "Carol", t3));
            commentRepo.save(new Comment("These look absolutely amazing!", "Jane", t5));

            System.out.println("✦ Taskflow ready — http://localhost:8080");
            System.out.println("  Login: demo@taskflow.app / demo1234");
        };
    }
}
