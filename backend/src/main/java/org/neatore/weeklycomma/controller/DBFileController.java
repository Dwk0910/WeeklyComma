package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.domain.User;
import org.neatore.weeklycomma.annotations.RequiresAuthentication;
import org.neatore.weeklycomma.service.DBFileService;
import org.neatore.weeklycomma.service.JwtService;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.net.URI;
import java.nio.charset.StandardCharsets;

@RestController @RequestMapping("/files") @RequiredArgsConstructor
public class DBFileController {
    private final DBFileService dbFileService;
    private final JwtService jwt;

    @GetMapping("/{id}")
    public ResponseEntity<Resource> getFile(@PathVariable String id,
            @CookieValue(value = "WCA_ACCESS", required = false) String token,
            @RequestHeader(value = "X-CSRF-Token", required = false) String csrf) {
        User user = token != null && jwt.validateToken(token) && jwt.getCsrfToken(token).equals(csrf) ? jwt.getUser(token) : null;
        var file = dbFileService.load(id, user);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.getName(), StandardCharsets.UTF_8).build().toString())
                .contentType(MediaType.APPLICATION_OCTET_STREAM).contentLength(file.getFile().length())
                .body(new FileSystemResource(file.getFile()));
    }

    @PostMapping @RequiresAuthentication
    public ResponseEntity<Void> saveFile(@CookieValue("WCA_ACCESS") String token,
            @RequestParam(value = "prevId", required = false) String prevId,
            @RequestParam(defaultValue = "public") String purpose, @RequestParam("file") MultipartFile file) {
        if (!purpose.equals("public") && !purpose.equals("inquiry")) throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        var id = dbFileService.upload(file, jwt.getUser(token), purpose.equals("inquiry"), prevId);
        return ResponseEntity.created(URI.create("/files/" + id)).build();
    }

    @DeleteMapping @RequiresAuthentication
    public ResponseEntity<Void> deleteFile(@CookieValue("WCA_ACCESS") String token, @RequestParam String id) {
        dbFileService.deleteUpload(id, jwt.getUser(token));
        return ResponseEntity.ok().build();
    }
}
