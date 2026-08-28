package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;
import org.apache.http.client.utils.URIBuilder;

import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.service.DBFileService;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.util.UriUtils;

import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;

@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class DBFileController {
    private final DBFileService dbFileService;

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getFile(@PathVariable String id) {
        try {
            DBFileService.DBFileResponse f_ = dbFileService.load(id);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + UriUtils.encode(f_.getName(), StandardCharsets.UTF_8) + "\"")
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .contentLength(f_.getFile().length())
                    .body(new FileSystemResource(f_.getFile()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> saveFile(@RequestParam(value = "prevId", required = false) String prevId, @RequestParam("file") MultipartFile file) throws URISyntaxException {
        // Save new file first
        String newId = dbFileService.save(file);

        // If a previous file id is provided and it's different from the newly created id,
        // attempt to delete the previous file so DB doesn't keep orphaned file records.
        if (prevId != null && !prevId.isEmpty() && !prevId.equals(newId)) {
            try {
                dbFileService.delete(prevId);
            } catch (Exception e) {
                // Suppress so upload still succeeds; log to stderr for diagnostics
                System.err.println("Failed to delete previous file id=" + prevId + ": " + e.getMessage());
            }
        }

        return ResponseEntity.created(
                new URIBuilder("/files/" + newId)
                        .build()
        ).build();
    }

    @DeleteMapping
    @RequiresAuthentication(User.UserType.CURATOR)
    public ResponseEntity<Void> deleteFile(@RequestParam String id) {
        this.dbFileService.delete(id);
        return ResponseEntity.ok().build();
    }
}
