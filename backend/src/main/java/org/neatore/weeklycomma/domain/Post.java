package org.neatore.weeklycomma.domain;

import org.neatore.weeklycomma.domain.abs.BaseTimeEntity;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.persistence.Embedded;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import com.fasterxml.jackson.annotation.JsonIgnore;

import org.neatore.weeklycomma.dto.PostDto;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public class Post extends BaseTimeEntity {
    public enum PostType {
        NOTICE, EVENT, G_RECOMMENDATION, W_RECOMMENDATION
    }

    public PostDto.GetResponse toQueryDto() {
        return new PostDto.GetResponse(
                this.postType,
                this.id,
                this.title,
                this.content,
                this.author,
                this.isPinned,
                this.getCreatedAt().getEpochSecond(),
                this.getModifiedAt().getEpochSecond(),
                this.attribution
        );
    }

    @Builder
    public Post(String title, String author, PostType postType, String content, Attribution attr) {
        this.title = title;
        this.author = author;
        this.postType = postType;
        this.content = content;
        this.attribution = attr;
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    @Embedded
    @Setter
    private Attribution attribution;

    @Enumerated(EnumType.STRING)
    private PostType postType;

    @Setter
    private boolean isPinned;

    @Setter
    private String title;
    @Setter
    private String author;

    @Lob
    @Setter
    private String content;

    @Data
    @Embeddable
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Attribution {
        private String bookId;

        @JsonIgnore
        public boolean isEmpty() {
            return bookId == null;
        }
    }
}
