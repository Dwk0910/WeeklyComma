package org.neatore.weeklycomma.service;

import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.DBFile;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.repository.DBFileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.File;
import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.time.Duration;
import java.util.*;

@Service
public class DBFileService {
    public static final long MAX_FILE_SIZE = 50L * 1024 * 1024;
    public static final long MAX_TOTAL_SIZE = 100L * 1024 * 1024;
    private final DBFileRepository repository;
    private final String dir;
    @Getter private File saveDirectory;

    public DBFileService(DBFileRepository repository, @Value("${DB_FILESAVE_DIR}") String dir) {
        this.repository = repository;
        this.dir = dir;
    }
    @PostConstruct public void init() {
        try { saveDirectory = Files.createDirectories(Path.of(dir)).toFile(); }
        catch (IOException e) { throw new IllegalStateException("Unable to create file directory", e); }
    }

    public record Attachment(UUID id, String name, String extension, long size) {}
    @Getter @RequiredArgsConstructor
    public static class DBFileResponse {
        private final File file;
        private final String name;
        private final DBFile.FileExtension extension;
    }

    public DBFileResponse load(String fileId, User user) {
        DBFile file = require(fileId);
        if (file.getOwnerId() != null) {
            requireUser(user);
            if (!file.getOwnerId().equals(user.getId()) && user.getUserType() != User.UserType.CURATOR)
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        Path path = path(file);
        if (!Files.isRegularFile(path)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return new DBFileResponse(path.toFile(), file.getOriginalFileName(), file.getExtension());
    }

    @Transactional
    public UUID upload(MultipartFile file, User user, boolean inquiry, String prevId) {
        requireUser(user);
        if (!inquiry && user.getUserType() != User.UserType.CURATOR)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (inquiry && prevId != null && !prevId.isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "문의 첨부에는 교체 ID를 사용할 수 없습니다.");
        DBFile previous = null;
        if (!inquiry && prevId != null && !prevId.isBlank()) {
            previous = require(prevId);
            if (previous.getOwnerId() != null) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        UUID id = saveFile(file, inquiry ? user.getId() : null);
        if (previous != null) remove(previous);
        return id;
    }

    @Transactional public UUID save(MultipartFile file) { return saveFile(file, null); }

    @Transactional public void delete(String fileId) {
        DBFile file = require(fileId);
        if (file.getOwnerId() != null) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        remove(file);
    }
    @Transactional public void deleteUpload(String fileId, User user) {
        requireUser(user);
        DBFile file = require(fileId);
        if (file.getOwnerId() == null) {
            if (user.getUserType() != User.UserType.CURATOR) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        } else {
            if (!file.getOwnerId().equals(user.getId())) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            if (file.getInquiryId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 문의에 첨부된 파일입니다.");
        }
        remove(file);
    }

    @Transactional public void attach(List<UUID> ids, User user, long inquiryId) {
        requireUser(user);
        if (ids.size() > 5 || new HashSet<>(ids).size() != ids.size()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        long total = 0;
        var files = new ArrayList<DBFile>();
        for (UUID id : ids) {
            if (id == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
            DBFile file = require(id.toString());
            if (!user.getId().equals(file.getOwnerId())) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            if (file.getInquiryId() != null) throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 문의에 첨부된 파일입니다.");
            if (!Files.isRegularFile(path(file))) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            total += file.getByteSize();
            files.add(file);
        }
        if (total > MAX_TOTAL_SIZE) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "첨부파일은 전체 100MB 이하여야 합니다.");
        files.forEach(file -> file.setInquiryId(inquiryId));
    }
    public List<Attachment> attachments(long inquiryId) {
        return repository.findByInquiryIdOrderByUploadedAtAsc(inquiryId).stream().map(f ->
                new Attachment(f.getId(), f.getOriginalFileName(), f.getExtension().name().toLowerCase(Locale.ROOT), f.getByteSize())).toList();
    }
    @Transactional public void deleteOwned(UUID ownerId) { repository.findByOwnerId(ownerId).forEach(this::remove); }
    @Transactional public void purgeUnusedUploads() {
        repository.findByOwnerIdIsNotNullAndInquiryIdIsNullAndUploadedAtBefore(
                Instant.now().minus(Duration.ofDays(1)), PageRequest.of(0, 100)).forEach(this::remove);
    }

    private UUID saveFile(MultipartFile file, UUID ownerId) {
        if (file.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "빈 파일은 업로드할 수 없습니다.");
        if (ownerId != null && file.getSize() > MAX_FILE_SIZE) throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "파일당 50MB까지 첨부할 수 있습니다.");
        String name = Objects.requireNonNullElse(file.getOriginalFilename(), "").replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\r\\n]", "_");
        int dot = name.lastIndexOf('.');
        DBFile.FileExtension extension;
        try {
            if (dot <= 0 || name.length() > 240) throw new IllegalArgumentException();
            extension = DBFile.FileExtension.valueOf(name.substring(dot + 1).toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "허용되지 않는 파일 확장자입니다."); }
        UUID id = UUID.randomUUID();
        DBFile record = new DBFile(id, extension, name);
        record.setOwnerId(ownerId); record.setByteSize(file.getSize()); record.setUploadedAt(Instant.now());
        Path target = path(record);
        try { file.transferTo(target); }
        catch (IOException e) { deleteDisk(target); throw new IllegalStateException("Unable to save file", e); }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) deleteDisk(target); }
        });
        repository.saveAndFlush(record);
        return id;
    }
    private DBFile require(String id) {
        try { return repository.findById(UUID.fromString(id)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)); }
        catch (IllegalArgumentException e) { throw new ResponseStatusException(HttpStatus.NOT_FOUND); }
    }
    private void requireUser(User user) { if (user == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED); }
    private Path path(DBFile file) {
        Path normalized = saveDirectory.toPath().resolve(file.getId() + "." + file.getExtension().name().toLowerCase(Locale.ROOT));
        if (Files.exists(normalized)) return normalized;
        String name = file.getOriginalFileName();
        String suffix = name.substring(name.lastIndexOf('.') + 1);
        if (suffix.equalsIgnoreCase(file.getExtension().name())) {
            Path legacy = saveDirectory.toPath().resolve(file.getId() + "." + suffix);
            if (Files.exists(legacy)) return legacy;
        }
        return normalized;
    }
    private void remove(DBFile file) {
        Path target = path(file);
        repository.delete(file);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { deleteDisk(target); }
        });
    }
    private void deleteDisk(Path path) {
        try { Files.deleteIfExists(path); }
        catch (IOException e) { org.neatore.weeklycomma.WeeklyComma.LOGGER.warn("Unable to remove file {}", path, e); }
    }
}
