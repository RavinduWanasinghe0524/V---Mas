package net.javaguids.ems_backend.config;

import net.javaguids.ems_backend.service.StorageService;
import net.javaguids.ems_backend.service.impl.LocalStorageService;
import net.javaguids.ems_backend.service.impl.S3StorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfig {

    @Value("${aws.s3.bucket:}")
    private String bucket;

    @Value("${aws.s3.region:}")
    private String region;

    @Value("${aws.s3.access-key:}")
    private String accessKey;

    @Value("${aws.s3.secret-key:}")
    private String secretKey;

    @Bean
    public StorageService storageService() {
        if (bucket != null && !bucket.trim().isEmpty() 
                && region != null && !region.trim().isEmpty()
                && accessKey != null && !accessKey.trim().isEmpty()
                && secretKey != null && !secretKey.trim().isEmpty()) {
            System.out.println("[StorageConfig] AWS S3 properties detected. Instantiating S3StorageService.");
            return new S3StorageService(bucket, region, accessKey, secretKey);
        } else {
            System.out.println("[StorageConfig] S3 properties missing/incomplete. Instantiating LocalStorageService.");
            return new LocalStorageService();
        }
    }
}
