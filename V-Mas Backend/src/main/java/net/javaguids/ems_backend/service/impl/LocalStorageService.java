package net.javaguids.ems_backend.service.impl;

import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.service.StorageService;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Objects;

public class LocalStorageService implements StorageService {

    @Override
    public String storeFile(String directory, String filename, MultipartFile file) {
        try {
            Path uploadPath = resolveUploadPath(directory);
            if (uploadPath == null) {
                throw new RuntimeException("Could not resolve upload path for directory: " + directory);
            }
            Files.createDirectories(uploadPath);

            Path filePath = uploadPath.resolve(filename);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return directory + "/" + filename;
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file locally: " + e.getMessage(), e);
        }
    }

    @Override
    public Resource loadFile(String filePath) {
        try {
            Path file = resolveUploadPath(filePath);
            if (file == null) {
                throw new ResourceNotFoundException("Resolved file path is null for path: " + filePath);
            }
            Resource resource = new UrlResource(Objects.requireNonNull(file.toUri()));
            if (resource.exists() || resource.isReadable()) {
                return resource;
            } else {
                throw new ResourceNotFoundException("File not found or not readable at local path: " + filePath);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Error loading local file path: " + e.getMessage(), e);
        }
    }

    @Override
    public void deleteFile(String filePath) {
        try {
            Path file = resolveUploadPath(filePath);
            if (file != null) {
                Files.deleteIfExists(file);
            }
        } catch (IOException e) {
            System.err.println("Warning: failed to delete local file at " + filePath + ": " + e.getMessage());
        }
    }

    private Path resolveUploadPath(String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            return null;
        }
        
        String cleanPath = relativePath;
        if (cleanPath.startsWith("uploads/")) {
            cleanPath = cleanPath.substring("uploads/".length());
        } else if (cleanPath.startsWith("uploads\\")) {
            cleanPath = cleanPath.substring("uploads\\".length());
        }

        Path cwd = Paths.get("").toAbsolutePath();
        Path uploadsDir;
        
        if (cwd.getFileName() != null && cwd.getFileName().toString().equals("V-Mas Backend")) {
            uploadsDir = cwd.resolve("uploads");
        } else if (Files.exists(cwd.resolve("V-Mas Backend"))) {
            uploadsDir = cwd.resolve("V-Mas Backend").resolve("uploads");
        } else if (Files.exists(cwd.resolve("V---Mas").resolve("V-Mas Backend"))) {
            uploadsDir = cwd.resolve("V---Mas").resolve("V-Mas Backend").resolve("uploads");
        } else {
            uploadsDir = cwd.resolve("uploads");
        }

        return uploadsDir.resolve(cleanPath).normalize();
    }
}
