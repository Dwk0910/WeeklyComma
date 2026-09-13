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
import java.time.LocalDate;
import java.time.ZoneId;

@Service
@RequiredArgsConstructor
public class PostService {
    private final PostRepository postRepository;

    @Transactional
    public long addPost(String title, String content, String author, Post.PostType type, Post.Attribution attr) {
        Post.Attribution savedAttribution = attr;
        if (type == Post.PostType.G_RECOMMENDATION && attr != null && attr.getBookId() != null) {
            LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
            savedAttribution = new Post.Attribution(
                    attr.getBookId(),
                    today.getYear(),
                    today.getMonthValue(),
                    getWeekOfMonth(today)
            );
        }

        Post post = Post.builder()
                .postType(type)
                .author(author)
                .title(title)
                .content(content)
                .attr(savedAttribution)
                .build();
        postRepository.save(post);
        return post.getId();
    }

    @Transactional
    public void editPost(Long id, PostDto.PostRequest request) {
        Post p = this.getPost(id);
        if (isPastRecommendation(p)) {
            throw new IllegalStateException("지난 주차 추천글은 수정할 수 없습니다.");
        }
        p.setTitle(request.title());
        p.setContent(request.content());
        postRepository.save(p);
    }

    @Transactional
    public void deletePost(Long id) {
        Post post = postRepository.getPostById(id);
        postRepository.delete(post);
    }

    @Transactional
    public Post getPost(long id) {
        Post p = postRepository.getPostById(id);
        if (p == null) throw new PostNotFoundException(id);
        migrateLegacyRecommendation(p);
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
    @Transactional
    public List<Post> getAllPosts(Post.PostType type, @Nullable Post.Attribution attr) {
        final List<Post> posts = postRepository.getPostsByPostType(type);
        posts.forEach(this::migrateLegacyRecommendation);
        if (attr != null) {
            return posts.stream()
                    .filter(post -> matchesAttribution(post.getAttribution(), attr))
                    .toList();
        } else return posts;
    }

    private boolean matchesAttribution(Post.Attribution postAttr, Post.Attribution requestedAttr) {
        if (postAttr == null) return false;
        if (requestedAttr.getBookId() != null
                && !Objects.equals(postAttr.getBookId(), requestedAttr.getBookId())) {
            return false;
        }
        if (requestedAttr.getRecommendationYear() != null
                && !Objects.equals(
                        postAttr.getRecommendationYear(), requestedAttr.getRecommendationYear())) {
            return false;
        }
        if (requestedAttr.getRecommendationMonth() != null
                && !Objects.equals(
                        postAttr.getRecommendationMonth(), requestedAttr.getRecommendationMonth())) {
            return false;
        }
        return requestedAttr.getRecommendationWeek() == null
                || Objects.equals(postAttr.getRecommendationWeek(), requestedAttr.getRecommendationWeek());
    }

    private boolean isPastRecommendation(Post post) {
        Post.Attribution attr = post.getAttribution();
        if (post.getPostType() != Post.PostType.G_RECOMMENDATION
                || attr == null
                || attr.getRecommendationYear() == null
                || attr.getRecommendationMonth() == null
                || attr.getRecommendationWeek() == null) {
            return false;
        }

        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return attr.getRecommendationYear() != today.getYear()
                || attr.getRecommendationMonth() != today.getMonthValue()
                || attr.getRecommendationWeek() != getWeekOfMonth(today);
    }

    private int getWeekOfMonth(LocalDate date) {
        return (date.getDayOfMonth() - 1) / 7 + 1;
    }

    private void migrateLegacyRecommendation(Post post) {
        Post.Attribution attr = post.getAttribution();
        if (post.getPostType() != Post.PostType.G_RECOMMENDATION
                || attr == null
                || attr.getBookId() == null
                || attr.getRecommendationYear() != null
                || attr.getRecommendationMonth() != null
                || attr.getRecommendationWeek() != null
                || post.getCreatedAt() == null) {
            return;
        }

        LocalDate createdDate = post.getCreatedAt()
                .atZone(ZoneId.of("Asia/Seoul"))
                .toLocalDate();
        post.setAttribution(new Post.Attribution(
                attr.getBookId(),
                createdDate.getYear(),
                createdDate.getMonthValue(),
                getWeekOfMonth(createdDate)
        ));
        postRepository.save(post);
    }

    @Transactional
    public void pinPost(long id, boolean pin) throws IllegalArgumentException {
        Post post = Optional.ofNullable(this.getPost(id)).orElseThrow(() -> new IllegalArgumentException("Post with id " + id + " does not exist"));
        post.setPinned(pin);
    }
}
