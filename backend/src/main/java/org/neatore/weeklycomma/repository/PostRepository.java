package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Post;

import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

@Repository
public interface PostRepository extends JpaRepository<Post, Integer> {
    List<Post> searchByTitle(String title);
    List<Post> searchByContent(String content);

    List<Post> getPostsByPostType(Post.PostType type);
    Post getPostById(long postId);
}
