package org.neatore.weeklycomma.service;

import jakarta.annotation.Nullable;
import lombok.RequiredArgsConstructor;

import org.neatore.weeklycomma.dto.PostDto;
import org.neatore.weeklycomma.exception.PostNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.neatore.weeklycomma.domain.Post;
import org.neatore.weeklycomma.repository.PostRepository;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;

    @Transactional
    public long addPost(String title, String content, String author, Post.PostType type, Post.Attribution attr) {
        Post post = Post.builder()
                .postType(type)
                .author(author)
                .title(title)
                .content(content)
                .attr(attr)
                .build();
        postRepository.save(post);
        return post.getId();
    }

    @Transactional
    public void editPost(Long id, PostDto.PostRequest request) {
        Post p = this.getPost(id);
        p.setTitle(request.title());
        p.setContent(request.content());
        postRepository.save(p);
    }

    @Transactional
    public void deletePost(Long id) {
        Post post = postRepository.getPostById(id);
        postRepository.delete(post);
    }

    public Post getPost(long id) {
        Post p = postRepository.getPostById(id);
        if (p == null) throw new PostNotFoundException(id);
        return p;
    }

    public Post getLatestNotice() {
        return postRepository.getLatestNotice().orElseThrow(() -> new PostNotFoundException(null));
    }

    /**
     * @deprecated use {@link #getAllPosts(Post.PostType postType, Post.Attribution attr)} instead.
     */
    @Deprecated
    public List<Post> getAllPosts() {
        return postRepository.findAll();
    }

    // Insert attribution field for detailed search
    public List<Post> getAllPosts(Post.PostType type, @Nullable Post.Attribution attr) {
        final List<Post> posts = postRepository.getPostsByPostType(type);
        if (attr != null) {
            return posts.stream().filter(post -> Objects.equals(post.getAttribution(), attr)).toList();
        } else return posts;
    }

    @Transactional
    public void pinPost(long id, boolean pin) throws IllegalArgumentException {
        Post post = Optional.ofNullable(this.getPost(id)).orElseThrow(() -> new IllegalArgumentException("Post with id " + id + " does not exist"));
        post.setPinned(pin);
    }
}
