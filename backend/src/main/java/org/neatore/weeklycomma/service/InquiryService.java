package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Locale;
import org.neatore.weeklycomma.domain.Inquiry;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.InquiryDto;
import org.neatore.weeklycomma.repository.InquiryRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InquiryService {
    private final InquiryRepository repository;
    private final DBFileService files;

    public InquiryDto.Listing list(User user, int page, boolean admin) {
        authorize(user, admin);
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var paging = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        var result = admin ? repository.findAll(paging) : repository.findByOwnerId(user.getId(), paging);
        return new InquiryDto.Listing(result.map(InquiryDto::summary).getContent(), result.getTotalElements(), result.getTotalPages());
    }

    public InquiryDto.Listing search(User user, int page, InquiryDto.Search input) {
        authorize(user, true);
        if (page < 0 || (input.from() != null && input.to() != null && input.from().isAfter(input.to())))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        for (var date : new java.time.LocalDate[]{input.from(), input.to()}) {
            if (date != null && (date.getYear() < 1 || date.getYear() > 9999))
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        String author = searchPattern(input.authorName());
        String title = searchPattern(input.title());
        String content = searchPattern(input.content());
        var zone = ZoneId.of("Asia/Seoul");
        Instant from = input.from() == null ? null : input.from().atStartOfDay(zone).toInstant();
        Instant until = input.to() == null ? null : input.to().plusDays(1).atStartOfDay(zone).toInstant();
        Specification<Inquiry> filter = (root, query, cb) -> {
            var predicates = new ArrayList<Predicate>();
            if (author != null) predicates.add(cb.like(cb.lower(root.get("authorName")), author, '\\'));
            if (title != null) predicates.add(cb.like(cb.lower(root.get("title")), title, '\\'));
            if (content != null) predicates.add(cb.like(root.get("content"), content, '\\'));
            if (from != null) predicates.add(cb.greaterThanOrEqualTo(root.<Instant>get("createdAt"), from));
            if (until != null) predicates.add(cb.lessThan(root.<Instant>get("createdAt"), until));
            return cb.and(predicates.toArray(Predicate[]::new));
        };
        var paging = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        var result = repository.findAll(filter, paging);
        return new InquiryDto.Listing(result.map(InquiryDto::summary).getContent(), result.getTotalElements(), result.getTotalPages());
    }

    private String searchPattern(String text) {
        if (text == null || text.isBlank()) return null;
        if (text.length() > 200) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return "%" + text.strip().toLowerCase(Locale.ROOT).replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%";
    }

    public InquiryDto.Detail get(User user, long id, boolean admin) {
        return detail(find(user, id, admin));
    }

    @Transactional
    public InquiryDto.Detail create(User user, InquiryDto.Create input) {
        authorize(user, false);
        if (input.category() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var inquiry = new Inquiry(user, input.category(), validText(input.title(), 150), validText(input.content(), 10000));
        repository.saveAndFlush(inquiry);
        files.attach(input.attachmentIds(), user, inquiry.getId());
        return detail(inquiry);
    }

    @Transactional
    public InquiryDto.Detail answer(User user, long id, InquiryDto.Answer input) {
        var inquiry = find(user, id, true);
        inquiry.answer(validText(input.content(), 10000));
        return detail(inquiry);
    }

    private InquiryDto.Detail detail(Inquiry inquiry) { return InquiryDto.detail(inquiry, files.attachments(inquiry.getId())); }

    private Inquiry find(User user, long id, boolean admin) {
        authorize(user, admin);
        return (admin ? repository.findById(id) : repository.findByIdAndOwnerId(id, user.getId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    private void authorize(User user, boolean admin) {
        if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        if (admin && user.getUserType() != User.UserType.CURATOR) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
    private String validText(String text, int max) {
        if (text == null || text.isBlank() || text.length() > max) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        return text.strip();
    }
}
