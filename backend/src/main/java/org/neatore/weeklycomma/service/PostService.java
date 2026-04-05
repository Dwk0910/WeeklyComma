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

    public Post getPost(long id) {
        Post post = postRepository.getPostById(id);

        if (post == null) throw new IllegalArgumentException("Post id " + id + " is not found.");
        else return post;
    }

    /**
     * @deprecated use {@link #getAllPosts(Post.PostType postType)} instead.
     */
    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    public List<Post> getAllPosts(Post.PostType type) {
        return postRepository.getPostsByPostType(type);
    }

    public void pinPost(long id, boolean pin) {
        Post post = getPost(id);
        post.setPinned(pin);
        postRepository.save(post);
    }
}
