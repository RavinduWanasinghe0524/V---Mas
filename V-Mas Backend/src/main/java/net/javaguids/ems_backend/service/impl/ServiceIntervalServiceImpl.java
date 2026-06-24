package net.javaguids.ems_backend.service.impl;

import lombok.AllArgsConstructor;
import net.javaguids.ems_backend.dto.ServiceIntervalDto;
import net.javaguids.ems_backend.entity.ServiceInterval;
import net.javaguids.ems_backend.enums.VehicleType;
import net.javaguids.ems_backend.exception.ResourceNotFoundException;
import net.javaguids.ems_backend.repository.ServiceIntervalRepository;
import net.javaguids.ems_backend.service.ServiceIntervalService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class ServiceIntervalServiceImpl implements ServiceIntervalService {

    private final ServiceIntervalRepository serviceIntervalRepository;

    private ServiceIntervalDto mapToDto(ServiceInterval entity) {
        return new ServiceIntervalDto(
                entity.getId(),
                entity.getVehicleType(),
                entity.getServiceType(),
                entity.getIntervalKm()
        );
    }


    @Override
    public List<ServiceIntervalDto> getAllIntervals() {
        return serviceIntervalRepository.findAll().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<ServiceIntervalDto> getIntervalsByVehicleType(VehicleType vehicleType) {
        return serviceIntervalRepository.findByVehicleType(vehicleType).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ServiceIntervalDto updateInterval(Long id, ServiceIntervalDto dto) {
        ServiceInterval interval = serviceIntervalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service interval not found with id: " + id));
        interval.setIntervalKm(dto.getIntervalKm());
        ServiceInterval saved = serviceIntervalRepository.save(interval);
        return mapToDto(saved);
    }

    @Override
    @Transactional
    public List<ServiceIntervalDto> updateIntervalsBulk(List<ServiceIntervalDto> dtos) {
        List<ServiceIntervalDto> updatedList = new ArrayList<>();
        for (ServiceIntervalDto dto : dtos) {
            if (dto.getId() != null) {
                ServiceInterval interval = serviceIntervalRepository.findById(dto.getId())
                        .orElseThrow(() -> new ResourceNotFoundException("Service interval not found with id: " + dto.getId()));
                interval.setIntervalKm(dto.getIntervalKm());
                ServiceInterval saved = serviceIntervalRepository.save(interval);
                updatedList.add(mapToDto(saved));
            } else if (dto.getVehicleType() != null && dto.getServiceType() != null) {
                // If it doesn't have an ID but exists, update it, otherwise create new
                ServiceInterval interval = serviceIntervalRepository.findByVehicleTypeAndServiceType(dto.getVehicleType(), dto.getServiceType())
                        .orElse(new ServiceInterval(null, dto.getVehicleType(), dto.getServiceType(), dto.getIntervalKm()));
                interval.setIntervalKm(dto.getIntervalKm());
                ServiceInterval saved = serviceIntervalRepository.save(interval);
                updatedList.add(mapToDto(saved));
            }
        }
        return updatedList;
    }
}
