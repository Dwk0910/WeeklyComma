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
import java.time.Instant;
import java.time.Duration;
import java.time.LocalDate;
import java.sql.Timestamp;
import org.springframework.jdbc.core.JdbcTemplate;
import java.nio.file.Files;
import java.util.List;
import java.util.UUID;
import java.io.*;
import org.springframework.web.multipart.MultipartFile;
import org.neatore.weeklycomma.domain.DBFile;
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
        context.registerBean(DBFileService.class, () -> new DBFileService(context.getBean(DBFileRepository.class), directory.resolve("files").toString()));
        context.registerBean(UserService.class, () -> new UserService(context.getBean(UserRepository.class), null,
                context.getBean(BookStarRepository.class), context.getBean(InquiryRepository.class), context.getBean(DBFileService.class)));
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

    @Test void adminSearchCombinesFieldsAndPaginatesMatchingInquiries() {
        for (int i = 0; i < 12; i++)
            inquiries.create(first, new InquiryDto.Create(Inquiry.Category.BOOK, "Book forest " + i, "함께 읽을 자연 이야기 Shared"));
        inquiries.create(second, new InquiryDto.Create(Inquiry.Category.BOOK, "Book forest", "함께 읽을 자연 이야기 Shared"));
        inquiries.create(first, new InquiryDto.Create(Inquiry.Category.BUG, "다른 제목", "자연 이야기"));
        inquiries.create(first, new InquiryDto.Create(Inquiry.Category.BUG, "Book forest", "다른 내용"));
        var filter = new InquiryDto.Search("  irs  ", "FOREST", "자연 이야기 SHARED", null, null);
        var firstPage = inquiries.search(curator, 0, filter);
        var secondPage = inquiries.search(curator, 1, filter);
        assertEquals(12, firstPage.total()); assertEquals(2, firstPage.pages());
        assertEquals(10, firstPage.items().size()); assertEquals(2, secondPage.items().size());
        assertEquals("Book forest 11", firstPage.items().get(0).title());
        assertEquals("Book forest 1", secondPage.items().get(0).title());
        assertEquals(15, inquiries.search(curator, 0, new InquiryDto.Search("  ", null, null, null, null)).total());
        assertEquals(1, inquiries.search(curator, 0, new InquiryDto.Search("Second", null, null, null, null)).total());
        assertEquals(0, inquiries.search(curator, 0, new InquiryDto.Search(null, "없는 제목", null, null, null)).total());
        fails(401, () -> inquiries.search(null, 0, filter));
        fails(403, () -> inquiries.search(first, 0, filter));
        fails(400, () -> inquiries.search(curator, -1, filter));
        fails(400, () -> inquiries.search(curator, 0, new InquiryDto.Search(null, "a".repeat(201), null, null, null)));
    }

    @Test void searchTreatsWildcardCharactersLiterally() {
        inquiries.create(first, new InquiryDto.Create(Inquiry.Category.OTHER, "100%_done\\path", "내용"));
        inquiries.create(first, new InquiryDto.Create(Inquiry.Category.OTHER, "100xxdonepath", "내용"));
        for (String term : List.of("%", "_", "\\", "100%_done\\path"))
            assertEquals(1, inquiries.search(curator, 0, new InquiryDto.Search(null, term, null, null, null)).total());
        assertEquals(0, inquiries.search(curator, 0, new InquiryDto.Search(null, "' OR 1=1 --", null, null, null)).total());
    }

    @Test void searchIncludesWholeKoreanCalendarDaysAndSupportsOpenDateBounds() {
        var jdbc = new JdbcTemplate(context.getBean(DataSource.class));
        String[] dates = {"2026-10-30T14:59:59Z", "2026-10-30T15:00:00Z", "2026-10-31T14:59:59.999Z", "2026-10-31T15:00:00Z"};
        for (int i = 0; i < dates.length; i++) {
            long id = inquiries.create(first, request("시각 " + i)).inquiry().id();
            jdbc.update("UPDATE inquiry SET created_at=? WHERE id=?", Timestamp.from(Instant.parse(dates[i])), id);
        }
        var date = LocalDate.parse("2026-10-31");
        var result = inquiries.search(curator, 0, new InquiryDto.Search(null, null, null, date, date));
        assertEquals(List.of("시각 2", "시각 1"), result.items().stream().map(InquiryDto.Summary::title).toList());
        assertEquals(3, inquiries.search(curator, 0, new InquiryDto.Search(null, null, null, date, null)).total());
        assertEquals(3, inquiries.search(curator, 0, new InquiryDto.Search(null, null, null, null, date)).total());
        fails(400, () -> inquiries.search(curator, 0, new InquiryDto.Search(null, null, null, date.plusDays(1), date)));
        fails(400, () -> inquiries.search(curator, 0, new InquiryDto.Search(null, null, null, null, LocalDate.MAX)));
    }

    @Test void bookConversationsKeepTheirCategoryThroughCuratorReply() {
        var saved = inquiries.create(first, new InquiryDto.Create(Inquiry.Category.BOOK, "함께 읽고 싶은 책", "다음에는 자연에 관한 책을 소개해 주세요."));
        long id = saved.inquiry().id();
        assertEquals(Inquiry.Category.BOOK, inquiries.list(first, 0, false).items().get(0).category());
        assertEquals(Inquiry.Category.BOOK, inquiries.list(curator, 0, true).items().get(0).category());
        inquiries.answer(curator, id, new InquiryDto.Answer("다음 추천 주제로 살펴보겠습니다."));
        var detail = inquiries.get(first, id, false);
        assertEquals(Inquiry.Category.BOOK, detail.inquiry().category());
        assertEquals("다음 추천 주제로 살펴보겠습니다.", detail.answer());
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

    DBFileService files() { return context.getBean(DBFileService.class); }
    MultipartFile file(String name) { return file(name, new byte[]{1, 2, 3}, 3); }
    MultipartFile file(String name, byte[] bytes, long size) {
        return new MultipartFile() {
            public String getName() { return "file"; }
            public String getOriginalFilename() { return name; }
            public String getContentType() { return "application/octet-stream"; }
            public boolean isEmpty() { return size == 0; }
            public long getSize() { return size; }
            public byte[] getBytes() { return bytes; }
            public InputStream getInputStream() { return new ByteArrayInputStream(bytes); }
            public void transferTo(File target) throws IOException { Files.write(target.toPath(), bytes); }
        };
    }
    InquiryDto.Create withFiles(List<UUID> ids) { return new InquiryDto.Create(Inquiry.Category.BUG, "첨부 문의", "첨부 내용", ids); }

    @Test void attachmentsArePrivateBeforeAndAfterSubmissionAndCannotBeReused() {
        var id = files().upload(file("화면 캡처.PNG"), first, true, null);
        assertEquals("화면 캡처.PNG", files().load(id.toString(), first).getName());
        assertTrue(files().load(id.toString(), curator).getFile().isFile());
        fails(401, () -> files().load(id.toString(), null));
        fails(404, () -> files().load(id.toString(), second));
        fails(404, () -> inquiries.create(second, withFiles(List.of(id))));
        assertEquals(0, inquiries.list(second, 0, false).total());
        var saved = inquiries.create(first, withFiles(List.of(id)));
        assertEquals(id, saved.attachments().get(0).id());
        assertEquals("png", saved.attachments().get(0).extension());
        assertEquals(3, saved.attachments().get(0).size());
        assertEquals(1, inquiries.get(curator, saved.inquiry().id(), true).attachments().size());
        assertEquals(1, inquiries.answer(curator, saved.inquiry().id(), new InquiryDto.Answer("답변")).attachments().size());
        fails(409, () -> inquiries.create(first, withFiles(List.of(id))));
        assertEquals(1, inquiries.list(first, 0, false).total());
        fails(409, () -> files().deleteUpload(id.toString(), first));
        fails(403, () -> files().delete(id.toString()));
    }

    @Test void normalMembersCannotReplaceOrDeletePublicAssets() {
        fails(403, () -> files().upload(file("public.png"), first, false, null));
        var publicId = files().upload(file("public.png"), curator, false, null);
        assertNotNull(files().load(publicId.toString(), null));
        fails(403, () -> files().deleteUpload(publicId.toString(), first));
        fails(400, () -> files().upload(file("private.png"), first, true, publicId.toString()));
        fails(404, () -> inquiries.create(first, withFiles(List.of(publicId))));
        var privateId = files().upload(file("private.png"), first, true, null);
        fails(403, () -> files().upload(file("replace.png"), curator, false, privateId.toString()));
        fails(404, () -> files().deleteUpload(privateId.toString(), second));
    }

    @Test void extensionsEmptyFilesAndSizeLimitsAreEnforced() {
        for (var extension : DBFile.FileExtension.values()) {
            var id = files().upload(file("test." + extension.name()), first, true, null);
            assertTrue(files().load(id.toString(), first).getFile().exists());
        }
        for (String name : List.of("script.svg", "script.html", "archive.zip", "run.exe", "no-extension", "fake.png.exe"))
            fails(400, () -> files().upload(file(name), first, true, null));
        fails(400, () -> files().upload(file("empty.jpg", new byte[0], 0), first, true, null));
        fails(413, () -> files().upload(file("large.mp4", new byte[]{1}, DBFileService.MAX_FILE_SIZE + 1), first, true, null));
        fails(400, () -> inquiries.create(first, withFiles(java.util.Collections.nCopies(6, UUID.randomUUID()))));
        var id = files().upload(file("duplicate.png"), first, true, null);
        fails(400, () -> inquiries.create(first, withFiles(List.of(id, id))));
        var largeIds = new java.util.ArrayList<UUID>();
        for (int i = 0; i < 3; i++) largeIds.add(files().upload(file("clip.mp4", new byte[]{1}, 40L * 1024 * 1024), first, true, null));
        fails(400, () -> inquiries.create(first, withFiles(largeIds)));
        assertEquals(0, inquiries.list(first, 0, false).total());
    }

    @Test void deletionUsesSamePathAsSavingAndSupportsLegacyExtensionCasing() throws Exception {
        var id = files().upload(file("My photo.JpG"), first, true, null);
        Path saved = files().load(id.toString(), first).getFile().toPath();
        assertTrue(saved.toString().endsWith(".jpg"));
        files().deleteUpload(id.toString(), first);
        assertFalse(Files.exists(saved));
        UUID oldId = UUID.randomUUID();
        var legacy = new DBFile(oldId, DBFile.FileExtension.PNG, "old.PnG");
        context.getBean(DBFileRepository.class).save(legacy);
        Path oldPath = directory.resolve("files").resolve(oldId + ".PnG");
        Files.write(oldPath, new byte[]{1});
        assertTrue(Files.isSameFile(oldPath, files().load(oldId.toString(), null).getFile().toPath()));
        files().delete(oldId.toString());
        assertFalse(Files.exists(oldPath));
    }

    @Test void abandonedUploadsExpireButAttachedAndPublicFilesSurvive() {
        var orphan = files().upload(file("orphan.png"), first, true, null);
        var attached = files().upload(file("attached.png"), first, true, null);
        var publicId = files().upload(file("public.png"), curator, false, null);
        var fresh = files().upload(file("fresh.png"), first, true, null);
        inquiries.create(first, withFiles(List.of(attached)));
        var repository = context.getBean(DBFileRepository.class);
        for (var id : List.of(orphan, attached, publicId)) {
            var row = repository.findById(id).orElseThrow(); row.setUploadedAt(Instant.now().minus(Duration.ofDays(2))); repository.save(row);
        }
        Path path = files().load(orphan.toString(), first).getFile().toPath();
        files().purgeUnusedUploads();
        assertFalse(Files.exists(path));
        fails(404, () -> files().load(orphan.toString(), first));
        for (var id : List.of(attached, publicId, fresh)) assertNotNull(files().load(id.toString(), first));
        context.getBean(UserService.class).deleteUser(first.getId());
        fails(404, () -> files().load(attached.toString(), curator));
        fails(404, () -> files().load(fresh.toString(), curator));
        assertNotNull(files().load(publicId.toString(), null));
    }
}
