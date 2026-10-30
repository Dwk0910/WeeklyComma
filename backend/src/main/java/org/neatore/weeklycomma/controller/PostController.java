package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.dto.PostDto;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.service.JwtService;
import org.neatore.weeklycomma.service.PostService;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import java.net.URI;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/posts")
@RequiredArgsConstructor
public class PostController {
    private final JwtService jwtService;
    private final PostService postService;

    @PostMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> post(@CookieValue("WCA_ACCESS") String token, @Valid @RequestBody PostDto.PostRequest postDto) {
        return ResponseEntity.created(URI.create("/posts/" + postService.addPost(
                postDto.title(),
                postDto.content(),
                Objects.requireNonNull(jwtService.getUser(token)).getUserName(),
                postDto.type(),
                postDto.attributions()
        ))).build();
    }

    @DeleteMapping("/{target}")
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> deletePost(@PathVariable Long target) {
        postService.deletePost(target);
        return ResponseEntity.ok().build();
    }

    @GetMapping
    public ResponseEntity<List<PostDto.GetResponse>> getPosts(@RequestParam Post.PostType postType, @ModelAttribute Post.Attribution attr) {
        List<PostDto.GetResponse> response = new ArrayList<>();
        postService.getAllPosts(postType, attr.isEmpty() ? null : attr).forEach(item ->
                response.add(item.toQueryDto())
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PostDto.GetResponse> getPost(@PathVariable Long id) {
        Post post = postService.getPost(id);

        if (post == null) return ResponseEntity.notFound().build();

        return ResponseEntity.ok().body(post.toQueryDto());
    }

    @GetMapping("/latestnotice")
    public ResponseEntity<PostDto.GetResponse> getLatestNotice() {
        return ResponseEntity.ok(this.postService.getLatestNotice().toQueryDto());
    }

    @PutMapping("/{id}")
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> editPost(@PathVariable Long id, @Valid @RequestBody PostDto.PostRequest postDto) {
        this.postService.editPost(id, postDto);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}")
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> pinPost(@RequestParam Boolean pin,
                                        @PathVariable Long id) {
        try {
            postService.pinPost(id, pin);
        } catch (IllegalArgumentException e) { return ResponseEntity.badRequest().build(); }
        return ResponseEntity.ok().build();
    }
}
