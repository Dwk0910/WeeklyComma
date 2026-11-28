package org.neatore.weeklycomma.service;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class BibliographicResponsibilityTest {
    @Test void readsExplicitResponsibilityMarkersFromProviderRecords() {
        assertEquals("백은별", BibliographicResponsibility.display("지은이: 백은별"));
        assertEquals("밍부몽", BibliographicResponsibility.display("저자 : 밍부몽"));
        assertEquals("전경철", BibliographicResponsibility.display("전경철 지음"));
        assertEquals("백은별", BibliographicResponsibility.display("지은이 ： 백은별"));
        assertEquals("백은별", BibliographicResponsibility.display("지은이 백은별"));
    }

    @Test void retainsEveryCoauthorAndOtherContributorRoles() {
        assertEquals("이준; 굄; 정무늬", BibliographicResponsibility.display("저자 : 이준;저자 : 굄;저자 : 정무늬;"));
        assertEquals("헤르만 헤세; 김영하 (옮김); 홍길동 (그림)",
                BibliographicResponsibility.display("헤르만 헤세 지음 ; 옮긴이: 김영하 ; 홍길동 그림"));
        assertEquals("김영하 (옮김)", BibliographicResponsibility.display("역자: 김영하"));
        assertEquals("존 저 (옮김)", BibliographicResponsibility.display("역자: 존 저"));
        var credits = BibliographicResponsibility.parse("저자: 홍길동; 역자: 김영하");
        assertEquals(BibliographicResponsibility.Role.TRANSLATOR, credits.get(1).role());
        assertEquals("역자: 김영하", credits.get(1).original());
    }

    @Test void doesNotGuessNamesOrDiscardUnrecognizedResponsibilityStatements() {
        for (String value : new String[]{"노리아", "지음", "지은이", "저자연구회", "이지음", "저자:",
                "김철수 글·그림", "감수: 홍길동", "글쓴이의 친구들", "Smith, John", "김철수 (필명: 저자)"}) {
            assertEquals(value, BibliographicResponsibility.display(value));
        }
        assertEquals("미상", BibliographicResponsibility.display("저자 미상"));
        assertEquals("Smith, John, Jane Doe", BibliographicResponsibility.display("저자: Smith, John, Jane Doe"));
        assertEquals("", BibliographicResponsibility.display(null));
        assertEquals("", BibliographicResponsibility.display(" ; "));
    }
}
