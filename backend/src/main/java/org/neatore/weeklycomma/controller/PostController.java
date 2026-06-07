package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.dto.PostDto;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.service.PostService;
import org.neatore.weeklycomma.service.UserService;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import java.net.URI;

import java.time.ZoneOffset;

import java.util.Objects;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {
    private final UserService userService;
    private final PostService postService;

    @PostMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> post(@CookieValue("WCA_LOGIN") String userToken, @Valid @RequestBody PostDto.PostRequest postDto) {
        return ResponseEntity.created(URI.create("/posts/" + postService.addPost(
                postDto.title(),
                postDto.content(),
                Objects.requireNonNull(userService.getUserByToken(userToken)).getUserName(),
                postDto.type()
        ))).build();
    }

    @DeleteMapping("/{target}")
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> deletePost(@PathVariable Long target) {
        postService.deletePost(target);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<PostDto.GetResponse>> getPosts(@RequestParam Post.PostType postType, @RequestParam(required = false) String bookId) {
        List<PostDto.GetResponse> response = new ArrayList<>();
        postService.getAllPosts(postType).forEach(item ->
                response.add(new PostDto.GetResponse(
                        item.getId(),
                        item.getPostType(),
                        item.getTitle(),
                        item.getContent(),
                        item.getAuthor(),
                        item.isPinned(),
                        item.getCreatedAt().toEpochSecond(ZoneOffset.UTC),
                        item.getModifiedAt().toEpochSecond(ZoneOffset.UTC)
                ))
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostDto.GetResponse> getPost(@PathVariable Long id) {
        Post post = postService.getPost(id);

        if (post == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok().body(new PostDto.GetResponse(
                post.getId(),
                post.getPostType(),
                post.getTitle(),
                post.getContent(),
                post.getAuthor(),
                post.isPinned(),
                post.getCreatedAt().toEpochSecond(ZoneOffset.UTC),
                post.getModifiedAt().toEpochSecond(ZoneOffset.UTC)
        ));
    }

    @PatchMapping("/{id}")
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> pinPost(@RequestParam boolean pin,
                                        @PathVariable Long id) {
        try {
            postService.pinPost(id, pin);
        } catch (IllegalArgumentException e) { return ResponseEntity.badRequest().build(); }
        return ResponseEntity.ok().build();
    }
}
