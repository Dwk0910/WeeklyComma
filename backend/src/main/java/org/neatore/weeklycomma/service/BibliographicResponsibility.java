package org.neatore.weeklycomma.service;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Adapter for the National Library ISBN API's unstructured AUTHOR statement.
 * This is not a general name sanitizer: only explicit responsibility markers at
 * a statement boundary are interpreted. Unknown statements are preserved.
 * Semicolons delimit responsibility groups; commas may belong to personal names.
 */
final class BibliographicResponsibility {
    private BibliographicResponsibility() {}

    enum Role {
        AUTHOR(""), TRANSLATOR("옮김"), ILLUSTRATOR("그림"), EDITOR("엮음");
        final String label;
        Role(String label) { this.label = label; }
    }

    record Credit(String names, Role role, String original) {
        String display() {
            return role == null ? original : names + (role.label.isEmpty() ? "" : " (" + role.label + ")");
        }
    }

    private record Rule(Role role, Pattern prefix, Pattern suffix) {}
    private static Rule rule(Role role, String prefixes, String suffixes) {
        return new Rule(role,
                Pattern.compile("^(?:" + prefixes + ")(?:\\s*[:：]\\s*|\\s+)(.+)$", Pattern.UNICODE_CHARACTER_CLASS),
                Pattern.compile("^(.+?)\\s+(?:" + suffixes + ")$", Pattern.UNICODE_CHARACTER_CLASS));
    }
    private static final List<Rule> RULES = List.of(
            rule(Role.AUTHOR, "저자|지은이|글쓴이|글", "지음|저|글"),
            rule(Role.TRANSLATOR, "역자|옮긴이|번역자|번역", "옮김|번역|역"),
            rule(Role.ILLUSTRATOR, "그린이|그림", "그림"),
            rule(Role.EDITOR, "엮은이|편자|편저자", "엮음|편저|편"));

    static List<Credit> parse(String statement) {
        if (statement == null || statement.isBlank()) return List.of();
        var credits = new ArrayList<Credit>();
        for (String group : statement.split("[;；]", -1)) {
            String original = group.strip();
            if (original.isEmpty()) continue;
            Credit credit = new Credit(original, null, original);
            for (Rule rule : RULES) {
                var prefix = rule.prefix.matcher(original);
                if (prefix.matches() && !prefix.group(1).isBlank()) {
                    credit = new Credit(prefix.group(1).strip(), rule.role, original);
                    break;
                }
            }
            // An explicit role prefix takes precedence over words inside the name.
            if (credit.role == null) {
                for (Rule rule : RULES) {
                    var suffix = rule.suffix.matcher(original);
                    if (suffix.matches() && !suffix.group(1).isBlank()) {
                        credit = new Credit(suffix.group(1).strip(), rule.role, original);
                        break;
                    }
                }
            }
            credits.add(credit);
        }
        return List.copyOf(credits);
    }

    static String display(String statement) {
        return String.join("; ", parse(statement).stream().map(Credit::display).toList());
    }
}
