package org.neatore.weeklycomma.controller;

import lombok.RequiredArgsConstructor;
import org.neatore.weeklycomma.dto.RecommendationPostDto;
import org.neatore.weeklycomma.service.RecommendationBoardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/recommendations")
public class RecommendationBoardController {
    private final RecommendationBoardService service;

    @GetMapping
    public List<RecommendationPostDto> getAll() { return service.getAll(); }

    @GetMapping("/{id}")
    public RecommendationPostDto get(@PathVariable long id) { return service.get(id); }
}
