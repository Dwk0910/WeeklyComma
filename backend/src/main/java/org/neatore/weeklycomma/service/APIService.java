package org.neatore.weeklycomma.service;

import org.springframework.web.util.UriComponentsBuilder;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;

import java.nio.charset.StandardCharsets;

import java.net.URL;

import java.util.Map;

import static org.neatore.weeklycomma.WeeklyComma.LOGGER;

@Service
public class APIService {

    @Value("${aladin_api_key}")
    private String key;

    private JSONObject callApi(String endpoint, Map<String, Object> urlQuery) {
        final UriComponentsBuilder uriBuilder = UriComponentsBuilder.fromUriString("https://www.aladin.co.kr/ttb/api/" + endpoint + ".aspx")
                .queryParam("ttbkey", key)
                .queryParam("version", "20131101")
                .queryParam("Output", "js");

        urlQuery.forEach(uriBuilder::queryParam);

        try {
            URL finalURL = uriBuilder.build().toUri().toURL();
            StringBuilder response = new StringBuilder();

            try (BufferedReader in = new BufferedReader(new InputStreamReader(finalURL.openStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = in.readLine()) != null) {
                    response.append(line);
                }
            }

            // 마지막에 ; 붙어서 오는 경우 대비 (알라딘 특유의 포맷 대응)
            String jsonStr = response.toString().trim();
            if (jsonStr.endsWith(";")) {
                jsonStr = jsonStr.substring(0, jsonStr.length() - 1);
            }

            return new JSONObject(jsonStr);
        } catch (IOException e) {
            LOGGER.fatal("An error occured while calling API: ", e);
            throw new RuntimeException(e);
        }
    }

    public JSONObject searchBooks(String query, String searchType) {
        return this.callApi("ItemSearch", Map.of(
                "Query", query,
                "QueryType", searchType,
                "SearchTarget", "Book",
                "Cover", "Big"
        ));
    }

    public JSONObject getBookByIsbn(String isbn) {
        return this.callApi("ItemLookUp", Map.of(
                "ItemIdType", "ISBN13",
                "ItemId", isbn
        ));
    }
}
