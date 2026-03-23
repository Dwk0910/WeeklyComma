package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.repository.PostRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;

    @Transactional
    public long addPost(String title, String content, String author, Post.PostType type) {
        Post post = new Post(title, author, type, content);
        postRepository.save(post);
        return post.getId();
    }

    public Post getPost(long id) throws IllegalArgumentException {
        Post post = postRepository.getPostById(id);

        if (post == null) throw new IllegalArgumentException("Post id " + id + " is not found.");
        else return post;
    }

    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    public void pinPost(long id) {
        getPost(id).setPinned(true);
    }
}
