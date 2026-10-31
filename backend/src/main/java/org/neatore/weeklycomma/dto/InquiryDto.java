package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.*;
import org.neatore.weeklycomma.domain.Inquiry;
import java.util.List;

public class InquiryDto {
    public record Create(@NotNull Inquiry.Category category, @NotBlank @Size(max = 150) String title,
                         @NotBlank @Size(max = 10000) String content) {}
    public record Answer(@NotBlank @Size(max = 10000) String content) {}
    public record Summary(long id, Inquiry.Category category, String title, String authorName,
                          long createdAt, boolean answered) {}
    public record Detail(Summary inquiry, String content, String answer, Long answeredAt) {}
    public record Listing(List<Summary> items, long total, int pages) {}

    public static Summary summary(Inquiry i) {
        return new Summary(i.getId(), i.getCategory(), i.getTitle(), i.getAuthorName(),
                i.getCreatedAt().getEpochSecond(), i.getAnswer() != null);
    }
    public static Detail detail(Inquiry i) {
        return new Detail(summary(i), i.getContent(), i.getAnswer(),
                i.getAnsweredAt() == null ? null : i.getAnsweredAt().getEpochSecond());
    }
}
