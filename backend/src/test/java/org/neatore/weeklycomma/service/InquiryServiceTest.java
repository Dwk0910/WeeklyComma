package org.neatore.weeklycomma.service;

import com.zaxxer.hikari.HikariDataSource;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.neatore.weeklycomma.domain.Inquiry;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.dto.InquiryDto;
import org.neatore.weeklycomma.dto.login.AuthType;
import org.neatore.weeklycomma.repository.*;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.web.server.ResponseStatusException;
import javax.sql.DataSource;
import java.nio.file.Path;
import java.time.Clock;
import static org.junit.jupiter.api.Assertions.*;

class InquiryServiceTest {
    @TempDir Path directory;
    AnnotationConfigApplicationContext context;
    InquiryService inquiries;
    User first, second, curator;

    @BeforeEach void setup() {
        var ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:sqlite:" + directory.resolve("inquiries.db"));
        ds.setMaximumPoolSize(1);
        context = new AnnotationConfigApplicationContext();
        context.registerBean(DataSource.class, () -> ds);
        context.registerBean(Clock.class, Clock::systemUTC);
        context.register(RecommendationExpirationServiceTest.TestConfiguration.class);
        context.registerBean(InquiryService.class);
        context.registerBean(UserService.class, () -> new UserService(context.getBean(UserRepository.class), null,
                context.getBean(BookStarRepository.class), context.getBean(InquiryRepository.class)));
        context.refresh();
        inquiries = context.getBean(InquiryService.class);
        var users = context.getBean(UserRepository.class);
        first = users.save(new User("First", "first@example.test", null, null, User.UserType.GENERAL, AuthType.LOCAL));
        second = users.save(new User("Second", "second@example.test", null, null, User.UserType.GENERAL, AuthType.LOCAL));
        curator = users.save(new User("Curator", "curator@example.test", null, null, User.UserType.CURATOR, AuthType.LOCAL));
    }
    @AfterEach void close() { if (context != null) context.close(); }
    InquiryDto.Create request(String title) { return new InquiryDto.Create(Inquiry.Category.BUG, title, "문의 내용"); }
    void fails(int status, org.junit.jupiter.api.function.Executable call) {
        assertEquals(status, assertThrows(ResponseStatusException.class, call).getStatusCode().value());
    }

    @Test void privateInquiriesAreIsolatedFromOtherUsersAndPublicPosts() {
        var saved = inquiries.create(first, request("첫 문의"));
        long id = saved.inquiry().id();
        assertEquals("First", saved.inquiry().authorName());
        assertEquals(1, inquiries.list(first, 0, false).total());
        assertEquals(0, inquiries.list(second, 0, false).total());
        fails(404, () -> inquiries.get(second, id, false));
        fails(404, () -> inquiries.get(curator, id, false));
        assertEquals("문의 내용", inquiries.get(curator, id, true).content());
        assertEquals(0, context.getBean(PostRepository.class).count());
        fails(401, () -> inquiries.list(null, 0, false));
        fails(401, () -> inquiries.create(null, request("비로그인")));
        fails(401, () -> inquiries.get(null, id, false));
        fails(403, () -> inquiries.list(first, 0, true));
        fails(403, () -> inquiries.get(second, id, true));
    }

    @Test void onlyCuratorsCanAnswerAndOwnerSeesPersistedAnswer() {
        long id = inquiries.create(first, request("문의")).inquiry().id();
        assertFalse(inquiries.get(first, id, false).inquiry().answered());
        fails(403, () -> inquiries.answer(first, id, new InquiryDto.Answer("위조 답변")));
        fails(401, () -> inquiries.answer(null, id, new InquiryDto.Answer("비로그인")));
        inquiries.answer(curator, id, new InquiryDto.Answer("  확인했습니다.  "));
        var result = inquiries.get(first, id, false);
        assertTrue(result.inquiry().answered());
        assertEquals("확인했습니다.", result.answer());
        assertNotNull(result.answeredAt());
        inquiries.answer(curator, id, new InquiryDto.Answer("수정 답변"));
        assertEquals("수정 답변", inquiries.get(first, id, false).answer());
        fails(404, () -> inquiries.answer(curator, Long.MAX_VALUE, new InquiryDto.Answer("답변")));
    }

    @Test void validationAndPaginationAreEnforced() {
        fails(400, () -> inquiries.create(first, request("  ")));
        fails(400, () -> inquiries.create(first, request("a".repeat(151))));
        fails(400, () -> inquiries.create(first, new InquiryDto.Create(null, "제목", "내용")));
        fails(400, () -> inquiries.create(first, new InquiryDto.Create(Inquiry.Category.OTHER, "제목", " ")));
        fails(400, () -> inquiries.create(first, new InquiryDto.Create(Inquiry.Category.OTHER, "제목", "a".repeat(10001))));
        for (int i = 0; i < 11; i++) inquiries.create(first, request("문의 " + i));
        var list = inquiries.list(first, 0, false);
        assertEquals(11, list.total()); assertEquals(2, list.pages()); assertEquals(10, list.items().size());
        assertEquals("문의 10", list.items().get(0).title());
        assertEquals(1, inquiries.list(first, 1, false).items().size());
        fails(400, () -> inquiries.list(first, -1, false));
        fails(400, () -> inquiries.answer(curator, list.items().get(0).id(), new InquiryDto.Answer("  ")));
        fails(400, () -> inquiries.answer(curator, list.items().get(0).id(), new InquiryDto.Answer("a".repeat(10001))));
    }

    @Test void deletingUserRemovesTheirPrivateInquiriesOnly() {
        inquiries.create(first, request("삭제할 문의"));
        long remaining = inquiries.create(second, request("남길 문의")).inquiry().id();
        context.getBean(UserService.class).deleteUser(first.getId());
        assertEquals(1, inquiries.list(curator, 0, true).total());
        assertEquals(remaining, inquiries.list(second, 0, false).items().get(0).id());
    }
}
