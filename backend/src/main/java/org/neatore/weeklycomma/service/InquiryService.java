package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
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

    public InquiryDto.Listing list(User user, int page, boolean admin) {
        authorize(user, admin);
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var paging = PageRequest.of(page, 10, Sort.by(Sort.Direction.DESC, "createdAt", "id"));
        var result = admin ? repository.findAll(paging) : repository.findByOwnerId(user.getId(), paging);
        return new InquiryDto.Listing(result.map(InquiryDto::summary).getContent(), result.getTotalElements(), result.getTotalPages());
    }

    public InquiryDto.Detail get(User user, long id, boolean admin) {
        return InquiryDto.detail(find(user, id, admin));
    }

    @Transactional
    public InquiryDto.Detail create(User user, InquiryDto.Create input) {
        authorize(user, false);
        if (input.category() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var inquiry = new Inquiry(user, input.category(), validText(input.title(), 150), validText(input.content(), 10000));
        return InquiryDto.detail(repository.saveAndFlush(inquiry));
    }

    @Transactional
    public InquiryDto.Detail answer(User user, long id, InquiryDto.Answer input) {
        var inquiry = find(user, id, true);
        inquiry.answer(validText(input.content(), 10000));
        return InquiryDto.detail(inquiry);
    }

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
