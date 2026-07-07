package net.javaguids.ems_backend.service;

import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

public interface StorageService {
    /**
     * Stores a file on the storage provider and returns the relative path/key to save in the database.
     *
     * @param directory The sub-directory or folder prefix (e.g., "uploads/service-attachments/17")
     * @param filename  The unique name of the file to save
     * @param file      The file wrapper containing bytes and metadata
     * @return The stored path or S3 key string
     */
    String storeFile(String directory, String filename, MultipartFile file);

    /**
     * Retrieves the file as a Resource.
     *
     * @param filePath The stored path or S3 key
     * @return The file resource
     */
    Resource loadFile(String filePath);

    /**
     * Deletes the file at the given path/key if it exists.
     *
     * @param filePath The stored path or S3 key
     */
    void deleteFile(String filePath);
}
