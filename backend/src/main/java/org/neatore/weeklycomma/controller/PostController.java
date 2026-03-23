package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.dto.PostDto;
import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.service.PostService;
import org.neatore.weeklycomma.annotations.RequiresAuthorization;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/post")
@RequiredArgsConstructor
public class PostController {
    private final PostService postService;

    @PostMapping
    @RequiresAuthorization
    public ResponseEntity<Void> post(@RequestBody PostDto postDto) {
        return ResponseEntity.created(URI.create("/getPost/" + postService.addPost(postDto.title(), postDto.content(), postDto.author(), postDto.type()))).build();
    }

    @GetMapping("/getPost/{id_}")
    public ResponseEntity<PostDto.GetRequest> getPost(@PathVariable String id_) {
        try {
            long id = Long.parseLong(id_);
            Post post = postService.getPost(id);

            if (post == null) return ResponseEntity.notFound().build();

            return ResponseEntity.ok().body(new PostDto.GetRequest(post.getId(), post.getPostType(), post.getTitle(), post.getContent(), post.getAuthor()));
        } catch (IllegalArgumentException e) { return ResponseEntity.badRequest().build(); }
    }

    @GetMapping("/getAllPosts")
    public ResponseEntity<List<PostDto>> getAllPosts() {
        List<PostDto> response = new ArrayList<>();
        postService.getAllPosts().forEach(item ->
                response.add(new PostDto(
                    item.getId(),
                    item.getPostType(),
                    item.getTitle(),
                    item.getContent(),
                    item.getAuthor()
                ))
        );

        return ResponseEntity.ok(response);
    }
}
