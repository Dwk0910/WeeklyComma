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

import org.springframework.data.jpa.domain.support.AuditingEntityListener;
import org.springframework.util.ReflectionUtils;

import java.util.Arrays;

@Entity
@EntityListeners(AuditingEntityListener.class)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Getter
public class Post extends BaseTimeEntity {
    public enum PostType {
        NOTICE, EVENT, RECOMMENDATION
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
    private String content;

    @Data
    @Embeddable
    @AllArgsConstructor
    @NoArgsConstructor(access = AccessLevel.PROTECTED)
    public static class Attribution {
        private String bookId;

        public boolean isEmpty() {
            // Post클래스의 모든 필드를 가져온 뒤 ReflectionUtils를 통해 이(this) 객체의 필드 값중 하나라도 null인지 확인
            return Arrays.stream(this.getClass().getDeclaredFields())
                    .allMatch(field -> {
                        ReflectionUtils.makeAccessible(field);
                        return ReflectionUtils.getField(field, this) == null;
                    });
        }
    }
}


