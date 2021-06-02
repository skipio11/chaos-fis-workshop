package com.skipio.demo.chaos.fis.composite.product;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class RecommendationService {
    private final RestTemplate restTemplate;

    public RecommendationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "recommendation", fallbackMethod = "fallback")
    public List<ProductComposite.Recommendation> getRecommendations(String productId){
        return restTemplate.exchange("http://recommendation/products/"+productId+"/recommendations", HttpMethod.GET, null, new ParameterizedTypeReference<List<ProductComposite.Recommendation>>() {}).getBody();
    }

    private List<ProductComposite.Recommendation> fallback(Exception e){
        List<ProductComposite.Recommendation> recommendations = new ArrayList<>();
        ProductComposite.Recommendation recommendation = new ProductComposite.Recommendation();
        recommendation.setAuthor("fallback author");
        recommendation.setContent("fallback comment");
        recommendation.setProductId("fallback productId");
        recommendation.setRate(0);
        recommendation.setRecommendationId("fallback recommendationId");

        recommendations.add(recommendation);

        return recommendations;
    }
}
