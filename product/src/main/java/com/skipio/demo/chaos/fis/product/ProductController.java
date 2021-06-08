package com.skipio.demo.chaos.fis.product;

import org.apache.commons.lang.RandomStringUtils;
import org.apache.commons.lang.StringUtils;
import org.apache.commons.lang.math.RandomUtils;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.PostConstruct;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.IntStream;

@RestController
public class ProductController {
    private Map<String, Product> productMap = new HashMap<>();

    @PostConstruct
    private void init(){
        for(int i=1; i<=10; i++){
            Product product = new Product("product-" + StringUtils.leftPad(String.valueOf(i), 3, "0"), "product " + RandomStringUtils.randomAlphabetic(5), RandomUtils.nextInt(50));
            productMap.put(product.getProductId(), product);
        }
    }

    @GetMapping("/products")
    public List<Product> getProducts(){
        sleep(50 + RandomUtils.nextInt(51));
        List<Product> products = new ArrayList<>();
        products.addAll(productMap.values());

        return products;
    }

    @GetMapping("/products/{productId}")
    public Product getProducts(@PathVariable String productId){
        sleep(50 + RandomUtils.nextInt(51));
        return productMap.get(productId);
    }

    private void sleep(long milliseconds){
        try {
            Thread.sleep(milliseconds);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}