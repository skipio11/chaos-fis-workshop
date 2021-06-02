package com.skipio.demo.chaos.fis.composite.product;

import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ProductService {
    private final RestTemplate restTemplate;

    public ProductService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "product", fallbackMethod = "fallback")
    public ProductComposite.Product getProduct(String productId){
        return restTemplate.getForObject("http://product/products/"+productId, ProductComposite.Product.class);
    }

    private ProductComposite.Product fallback(Exception e){
        ProductComposite.Product product = new ProductComposite.Product();

        product.setProductId("fallback-product-id");
        product.setProductName("fallback-product-name");
        product.setWeight(0);

        return product;
    }
}
