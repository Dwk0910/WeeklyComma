package org.neatore.weeklycomma.dto.login;

public enum AuthType {
    LOCAL, OAUTH_NAVER, OAUTH_GOOGLE;

    // Preserve existing Naver IDs while keeping new providers in separate namespaces.
    public String subjectKey(String subject) {
        if (this == LOCAL) throw new IllegalArgumentException("Local users do not have an OAuth subject");
        return this == OAUTH_NAVER ? subject : name() + ":" + subject;
    }
}
