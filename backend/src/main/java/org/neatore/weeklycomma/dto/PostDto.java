package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

import org.neatore.weeklycomma.domain.Post;

import java.time.LocalDateTime;

public abstract class PostDto {
    public record GetRequest(
            @NotBlank Long id,
            @NotBlank Post.PostType type,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String author,
            @NotBlank LocalDateTime createdAt,
            @NotBlank LocalDateTime updatedAt
    ) {}

    public record PostRequest(
            @NotBlank Post.PostType type,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String author
    ) {}
}
