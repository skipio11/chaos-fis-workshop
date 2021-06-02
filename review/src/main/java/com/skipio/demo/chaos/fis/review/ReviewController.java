package com.skipio.demo.chaos.fis.review;

import org.apache.commons.lang.RandomStringUtils;
import org.apache.commons.lang.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class ReviewController {
    private Map<String, Map<String, Review>> productReviewMap = new HashMap<>();

    @PostConstruct
    private void init(){
        for(int i=1; i<=10; i++){
            String productId = "product-" + StringUtils.leftPad(String.valueOf(i), 3, "0");
            productReviewMap.put(productId, generateReviewMap(productId));
        }
    }

    private Map<String, Review> generateReviewMap(String productId){
        Map<String, Review> reviewMap = new HashMap<>();
        for(int i=1; i<=3; i++){
            Review review = new Review(productId, "review-" + StringUtils.leftPad(String.valueOf(i), 3, "0"), "author " + RandomStringUtils.randomAlphabetic(5), "subject " + RandomStringUtils.randomAlphabetic(5), "contents " + RandomStringUtils.randomAlphabetic(5));
            reviewMap.put(review.getReviewId(), review);
        }

        return reviewMap;
    }

    @GetMapping("/products/{productId}/reviews")
    public List<Review> getReviews(@PathVariable String productId){
        List<Review> reviews = new ArrayList<>();
        reviews.addAll(productReviewMap.get(productId).values());

        return reviews;
    }

    @GetMapping("/products/{productId}/reviews/{reviewId}")
    public Review getReview(@PathVariable String productId, @PathVariable String reviewId){
        return productReviewMap.get(productId).get(reviewId);
    }
}
