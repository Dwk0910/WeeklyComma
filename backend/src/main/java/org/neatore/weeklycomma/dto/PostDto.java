package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;

import org.neatore.weeklycomma.domain.Post;

public abstract class PostDto {
    public record GetRequest(
            @NotBlank Long id,
            @NotBlank Post.PostType type,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String author,
            @NotBlank boolean isPinned,
            @NotBlank long createdAt,
            @NotBlank long updatedAt
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
