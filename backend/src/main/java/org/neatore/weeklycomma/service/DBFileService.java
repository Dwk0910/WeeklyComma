package org.neatore.weeklycomma.service;

import static org.neatore.weeklycomma.WeeklyComma.LOGGER;

import org.neatore.weeklycomma.domain.DBFile;
import org.neatore.weeklycomma.repository.DBFileRepository;

import org.apache.logging.log4j.core.util.FileUtils;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.transaction.Transactional;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.AccessLevel;

import java.io.File;
import java.io.IOException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DBFileService {
    private final DBFileRepository repository;

    @Value("${DB_FILESAVE_DIR}")
    private String dir;

    @Getter
    private File saveDirectory;

    @PostConstruct
    public void init() {
        this.saveDirectory = new File(dir);
        if (!this.saveDirectory.exists() || !this.saveDirectory.isDirectory()) {
            Path alter = Paths.get(System.getProperty("user.dir"), "data", "filedata");
            LOGGER.warn("DBFileService : Specified directory ({}) does not exist or is not a directory. Process will make the new directory and use it. ({})", dir, alter);
            if (!this.saveDirectory.mkdirs()) throw new RuntimeException("DBFileService : Unable to create directory (%s)".formatted(alter));
        }
    }

    @RequiredArgsConstructor(access = AccessLevel.PRIVATE)
    @Getter
    public static class DBFileResponse {
        private final File file;
        private final String name;
        private final DBFile.FileExtension extension;
    }

    /**
     * @throws IllegalArgumentException if the file with the provided ID does not exist in the database.
     */
    public DBFileResponse load(String fileId) {
        UUID id = UUID.fromString(fileId);
        DBFile dbFile = this.repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("File not found: " + fileId));

        Path p = this.saveDirectory.toPath().resolve(dbFile.getId() + "." + dbFile.getExtension().name().toLowerCase());
        return new DBFileResponse(p.toFile(), dbFile.getOriginalFileName(), dbFile.getExtension());
    }

    @Transactional
    public void delete(String fileId) {
        UUID id = UUID.fromString(fileId);
        DBFile dbFile = this.repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("File not found: " + fileId));

        try {
            Files.deleteIfExists(this.saveDirectory.toPath().resolve(fileId + "." + dbFile.getExtension()));
        } catch (IOException e) {
            throw new RuntimeException(e);
        }

        this.repository.delete(dbFile);
    }

    @Transactional
    public UUID save(MultipartFile file, boolean secured) {
        UUID uuid = UUID.randomUUID();

        File f_virtual = new File(Objects.requireNonNull(file.getOriginalFilename()));
        String ext_ = FileUtils.getFileExtension(f_virtual);

        DBFile.FileExtension ext;
        try {
            ext = DBFile.FileExtension.valueOf(ext_.toUpperCase());

            Path p = this.saveDirectory.toPath().resolve(uuid + "." + ext_);
            Files.createFile(p);
            file.transferTo(p);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Unsupported file extension: " + ext_, e);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }


        this.repository.save(new DBFile(uuid, secured, ext, f_virtual.getName().replace(" ", "")));
        return uuid;
    }
}

