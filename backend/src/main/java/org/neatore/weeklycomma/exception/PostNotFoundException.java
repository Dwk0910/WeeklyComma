package org.neatore.weeklycomma.exception;

public class PostNotFoundException extends RuntimeException {
    public PostNotFoundException(Long id) {
        super("Post not found with ID : " + id);
    }
}
