package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

import org.neatore.weeklycomma.domain.Post;

public abstract class PostDto {
    public record GetResponse(
            @NotBlank Long id,
            @NotBlank Post.PostType type,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String author,
            @NotBlank Boolean isPinned,
            @NotBlank Long createdAt,
            @NotBlank Long updatedAt
    ) {}

    public record PostRequest(
            @NotBlank Post.PostType type,
            @NotBlank String title,
            @NotBlank String content
    ) {}

    public record DeleteRequest(
            @NotBlank Long id
    ) {}
}
