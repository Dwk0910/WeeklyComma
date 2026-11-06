package org.neatore.weeklycomma.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component @RequiredArgsConstructor
public class UnusedUploadCleanup {
    private final DBFileService files;
    @Scheduled(fixedDelay = 3600000, initialDelay = 3600000)
    public void cleanup() { files.purgeUnusedUploads(); }
}
