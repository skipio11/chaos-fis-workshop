package com.skipio.demo.chaos.fis.composite.product;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class ProductCompositeController {
    private final ProductCompositeService productCompositeService;

    public ProductCompositeController(ProductCompositeService productCompositeService) {
        this.productCompositeService = productCompositeService;
    }

    @GetMapping("/")
    public String healthCheck(){
        return "healthCheck";
    }

    @GetMapping("/product-composites")
    public List<ProductComposite> getProductComposites(){
        return productCompositeService.getProductComposites();
    }

    @GetMapping("/product-composites/{productId}")
    public ProductComposite getProductComposites(@PathVariable String productId){
        return productCompositeService.getProductComposite(productId);
    }
}
