package org.neatore.weeklycomma.service;

import static org.neatore.weeklycomma.WeeklyComma.LOGGER;

import jakarta.annotation.PostConstruct;

import lombok.Getter;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Service
public class FileSavingService {
    @Value("${db_filesave_dir}")
    private String dir;

    @Getter
    private File saveDirectory;

    @PostConstruct
    public void init() {
        this.saveDirectory = new File(dir);
        if (!this.saveDirectory.exists() || !this.saveDirectory.isDirectory()) {
            Path alter = Paths.get(System.getProperty("user.dir"), "data", "filedata");
            LOGGER.warn("FileSavingService : Specified directory ({}) does not exist or is not a directory. Process will make the new directory and use it. ({})", dir, alter);
            if (!this.saveDirectory.mkdirs()) throw new RuntimeException("FileSacingService : Unable to create directory (%s)".formatted(alter));
        }
    }

    public File getSaveFile(String filename) {
        return new File(saveDirectory, filename);
    }

    public void save(File file) throws IOException {
        Files.copy(file.toPath(), saveDirectory.toPath().resolve(file.getName()));
    }
}
