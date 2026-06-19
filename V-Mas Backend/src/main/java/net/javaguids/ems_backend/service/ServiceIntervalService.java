package net.javaguids.ems_backend.service;

import net.javaguids.ems_backend.dto.ServiceIntervalDto;
import net.javaguids.ems_backend.enums.VehicleType;

import java.util.List;

public interface ServiceIntervalService {
    List<ServiceIntervalDto> getAllIntervals();
    List<ServiceIntervalDto> getIntervalsByVehicleType(VehicleType vehicleType);
    ServiceIntervalDto updateInterval(Long id, ServiceIntervalDto dto);
    List<ServiceIntervalDto> updateIntervalsBulk(List<ServiceIntervalDto> dtos);
}
