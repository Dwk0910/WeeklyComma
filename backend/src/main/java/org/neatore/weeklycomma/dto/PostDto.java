package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import org.neatore.weeklycomma.domain.Post;

public abstract class PostDto {
    public record GetResponse(
            @NotNull Post.PostType type,
            @NotBlank Long id,
            @NotBlank String title,
            @NotBlank String content,
            @NotBlank String author,
            @NotBlank Boolean isPinned,
            @NotBlank Long createdAt,
            @NotBlank Long updatedAt,
            Post.Attribution attributions
    ) {}

    public record PostRequest(
            @NotNull Post.PostType type,
            @NotBlank String title,
            @NotBlank String content,
            Post.Attribution attributions
    ) {}

    public record DeleteRequest(
            @NotBlank Long id
    ) {}
}
