package org.neatore.weeklycomma.util;

import java.util.List;

public final class BookIsbn {
    private BookIsbn() {}

    public static String canonical(String raw) {
        if (raw == null) return null;
        String isbn = raw.replaceAll("[-\\s]", "").toUpperCase(java.util.Locale.ROOT);
        if (isbn.matches("\\d{9}[\\dX]")) {
            int sum = 0;
            for (int i = 0; i < 10; i++) sum += (10 - i) * (isbn.charAt(i) == 'X' ? 10 : isbn.charAt(i) - '0');
            if (sum % 11 != 0) return null;
            String prefix = "978" + isbn.substring(0, 9);
            return prefix + checkDigit(prefix);
        }
        if (isbn.matches("97[89]\\d{10}") && checkDigit(isbn.substring(0, 12)) == isbn.charAt(12) - '0') return isbn;
        return null;
    }

    public static List<String> aliases(String raw) {
        String isbn = canonical(raw);
        if (isbn == null) return List.of(raw);
        if (!isbn.startsWith("978")) return List.of(raw, isbn);
        String prefix = isbn.substring(3, 12);
        int sum = 0;
        for (int i = 0; i < 9; i++) sum += (10 - i) * (prefix.charAt(i) - '0');
        int digit = (11 - sum % 11) % 11;
        return List.of(raw, isbn, prefix + (digit == 10 ? "X" : String.valueOf(digit)));
    }

    private static int checkDigit(String prefix) {
        int sum = 0;
        for (int i = 0; i < 12; i++) sum += (prefix.charAt(i) - '0') * (i % 2 == 0 ? 1 : 3);
        return (10 - sum % 10) % 10;
    }
}
