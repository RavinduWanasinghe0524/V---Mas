package net.javaguids.ems_backend.service.impl;

import net.javaguids.ems_backend.service.StorageService;
import org.springframework.core.io.AbstractResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.ResponseInputStream;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.util.Objects;
import org.springframework.lang.NonNull;

public class S3StorageService implements StorageService {

    private final S3Client s3Client;
    private final String bucketName;

    public S3StorageService(String bucketName, String region, String accessKey, String secretKey) {
        this.bucketName = bucketName;
        this.s3Client = S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(accessKey, secretKey)))
                .build();
    }

    @Override
    public String storeFile(String directory, String filename, MultipartFile file) {
        // Clean relative path (S3 key)
        String s3Key = cleanS3Key(directory + "/" + filename);
        
        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putObjectRequest, 
                    RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            // Return the key to save in the database
            return s3Key;
        } catch (IOException e) {
            throw new RuntimeException("Failed to upload file to S3: " + e.getMessage(), e);
        }
    }

    @Override
    public Resource loadFile(String filePath) {
        String s3Key = cleanS3Key(filePath);

        try {
            GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();

            ResponseInputStream<GetObjectResponse> s3is = s3Client.getObject(getObjectRequest);
            GetObjectResponse response = s3is.response();

            // Extract original base filename from S3 key path
            String filename = s3Key.substring(s3Key.lastIndexOf('/') + 1);

            return new S3Resource(s3is, filename, response.contentLength());
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch file from S3: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String filePath) {
        String s3Key = cleanS3Key(filePath);
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(bucketName)
                    .key(s3Key)
                    .build();
            s3Client.deleteObject(deleteObjectRequest);
        } catch (Exception e) {
            System.err.println("Warning: failed to delete S3 file at key " + s3Key + ": " + e.getMessage());
        }
    }

    private String cleanS3Key(String path) {
        if (path == null) {
            return "";
        }
        // Normalize backslashes to forward slashes for S3 keys
        String clean = path.replace("\\", "/");
        if (clean.startsWith("/")) {
            clean = clean.substring(1);
        }
        return clean;
    }

    /**
     * Custom Spring Resource implementation that streams S3 object contents.
     */
    public static class S3Resource extends AbstractResource {
        private final ResponseInputStream<GetObjectResponse> inputStream;
        private final String filename;
        private final long contentLength;

        public S3Resource(ResponseInputStream<GetObjectResponse> inputStream, String filename, long contentLength) {
            this.inputStream = inputStream;
            this.filename = filename;
            this.contentLength = contentLength;
        }

        @Override
        @NonNull
        public String getDescription() {
            return "AWS S3 Resource: " + filename;
        }

        @Override
        @NonNull
        public InputStream getInputStream() throws IOException {
            return Objects.requireNonNull(inputStream);
        }

        @Override
        public String getFilename() {
            return filename;
        }

        @Override
        public long contentLength() throws IOException {
            return contentLength;
        }

        @Override
        public boolean exists() {
            return true;
        }

        @Override
        public boolean isOpen() {
            return true;
        }
    }
}
