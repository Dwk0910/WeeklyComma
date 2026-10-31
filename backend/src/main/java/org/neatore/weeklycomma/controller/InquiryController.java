package org.neatore.weeklycomma.controller;

import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.InquiryDto;
import org.neatore.weeklycomma.service.InquiryService;
import org.neatore.weeklycomma.service.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/inquiries")
public class InquiryController {
    private final InquiryService inquiries;
    private final JwtService jwt;

    @GetMapping @RequiresAuthentication
    public InquiryDto.Listing list(@CookieValue("WCA_ACCESS") String token, @RequestParam(defaultValue = "0") int page) {
        return inquiries.list(jwt.getUser(token), page, false);
    }
    @GetMapping("/{id}") @RequiresAuthentication
    public InquiryDto.Detail get(@CookieValue("WCA_ACCESS") String token, @PathVariable long id) {
        return inquiries.get(jwt.getUser(token), id, false);
    }
    @PostMapping @RequiresAuthentication @ResponseStatus(HttpStatus.CREATED)
    public InquiryDto.Detail create(@CookieValue("WCA_ACCESS") String token, @Valid @RequestBody InquiryDto.Create input) {
        return inquiries.create(jwt.getUser(token), input);
    }
    @GetMapping("/admin") @RequiresAuthentication(User.UserType.CURATOR)
    public InquiryDto.Listing adminList(@CookieValue("WCA_ACCESS") String token,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(required = false) String authorName,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String content,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return inquiries.search(jwt.getUser(token), page, new InquiryDto.Search(authorName, title, content, from, to));
    }
    @GetMapping("/admin/{id}") @RequiresAuthentication(User.UserType.CURATOR)
    public InquiryDto.Detail adminGet(@CookieValue("WCA_ACCESS") String token, @PathVariable long id) {
        return inquiries.get(jwt.getUser(token), id, true);
    }
    @PutMapping("/admin/{id}/answer") @RequiresAuthentication(User.UserType.CURATOR)
    public InquiryDto.Detail answer(@CookieValue("WCA_ACCESS") String token, @PathVariable long id, @Valid @RequestBody InquiryDto.Answer input) {
        return inquiries.answer(jwt.getUser(token), id, input);
    }
}
