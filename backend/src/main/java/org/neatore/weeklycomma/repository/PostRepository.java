package org.neatore.weeklycomma.repository;

import org.neatore.weeklycomma.domain.Post;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Integer> {
    List<Post> searchByTitle(String title);
    List<Post> searchByContent(String content);

    List<Post> getPostsByPostType(Post.PostType type);
    List<Post> findByPostTypeInOrderByCreatedAtDescIdDesc(List<Post.PostType> types);
    Post getPostById(long postId);

    Optional<Post> findFirstByPostTypeOrderByCreatedAtDescIdDesc(Post.PostType type);
}
