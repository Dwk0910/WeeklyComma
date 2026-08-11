package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Integer> {
    List<Post> searchByTitle(String title);
    List<Post> searchByContent(String content);

    List<Post> getPostsByPostType(Post.PostType type);
    Post getPostById(long postId);

    @Query("SELECT p FROM Post p WHERE p.postType == Post.PostType.NOTICE ORDER BY p.createdAt DESC")
    Optional<Post> getLatestNotice();
}
