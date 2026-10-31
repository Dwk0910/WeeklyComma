package org.neatore.weeklycomma.dto;

import jakarta.validation.constraints.*;
import org.neatore.weeklycomma.domain.Inquiry;
import java.util.List;
import java.util.UUID;
import org.neatore.weeklycomma.service.DBFileService.Attachment;

public class InquiryDto {
    public record Create(@NotNull Inquiry.Category category, @NotBlank @Size(max = 150) String title,
                         @NotBlank @Size(max = 10000) String content, @Size(max = 5) List<@NotNull UUID> attachmentIds) {
        public Create { attachmentIds = attachmentIds == null ? List.of() : attachmentIds; }
        public Create(Inquiry.Category category, String title, String content) { this(category, title, content, List.of()); }
    }
    public record Answer(@NotBlank @Size(max = 10000) String content) {}
    public record Summary(long id, Inquiry.Category category, String title, String authorName,
                          long createdAt, boolean answered) {}
    public record Detail(Summary inquiry, String content, String answer, Long answeredAt, List<Attachment> attachments) {}
    public record Listing(List<Summary> items, long total, int pages) {}

    public static Summary summary(Inquiry i) {
        return new Summary(i.getId(), i.getCategory(), i.getTitle(), i.getAuthorName(),
                i.getCreatedAt().getEpochSecond(), i.getAnswer() != null);
    }
    public static Detail detail(Inquiry i, List<Attachment> attachments) {
        return new Detail(summary(i), i.getContent(), i.getAnswer(),
                i.getAnsweredAt() == null ? null : i.getAnsweredAt().getEpochSecond(), attachments);
    }
}
