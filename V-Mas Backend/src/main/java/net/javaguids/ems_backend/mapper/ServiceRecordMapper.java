package net.javaguids.ems_backend.mapper;

import net.javaguids.ems_backend.dto.ServiceRecordDto;
import net.javaguids.ems_backend.entity.ServiceRecord;

public class ServiceRecordMapper {

    public static ServiceRecordDto mapToServiceRecordDto(ServiceRecord record) {
        ServiceRecordDto dto = new ServiceRecordDto();
        dto.setId(record.getId());
        dto.setVehicleRegNumber(record.getVehicleRegNumber());
        dto.setServiceType(record.getServiceType());
        dto.setServiceTypeDetail(record.getServiceTypeDetail());
        dto.setServiceDate(record.getServiceDate());
        dto.setCurrentMileageKm(record.getCurrentMileageKm());
        dto.setServiceCost(record.getServiceCost());
        dto.setTechnicianWorkshop(record.getTechnicianWorkshop());
        dto.setNextServiceDue(record.getNextServiceDue());
        dto.setNextServiceMileageKm(record.getNextServiceMileageKm());
        dto.setDescription(record.getDescription());
        dto.setCreatedBy(record.getCreatedBy());
        dto.setAttachmentPath(record.getAttachmentPath());
        dto.setPartsReplaced(record.getPartsReplaced());
        dto.setServiceClassification(record.getServiceClassification());
        dto.setCreatedAt(record.getCreatedAt());
        dto.setDeleted(record.isDeleted());
        dto.setDeletedBy(record.getDeletedBy());
        dto.setDeletedAt(record.getDeletedAt());
        dto.setStatus(record.getStatus());
        return dto;
    }

    public static ServiceRecord mapToServiceRecord(ServiceRecordDto dto) {
        ServiceRecord record = new ServiceRecord();
        record.setVehicleRegNumber(dto.getVehicleRegNumber());
        record.setServiceType(dto.getServiceType());
        record.setServiceTypeDetail(dto.getServiceTypeDetail());
        record.setServiceDate(dto.getServiceDate());
        record.setCurrentMileageKm(dto.getCurrentMileageKm());
        record.setServiceCost(dto.getServiceCost());
        record.setTechnicianWorkshop(dto.getTechnicianWorkshop());
        record.setNextServiceDue(dto.getNextServiceDue());
        record.setNextServiceMileageKm(dto.getNextServiceMileageKm());
        record.setDescription(dto.getDescription());
        record.setPartsReplaced(dto.getPartsReplaced());
        if (dto.getServiceClassification() != null) {
            record.setServiceClassification(dto.getServiceClassification());
        }
        if (dto.getStatus() != null) {
            record.setStatus(dto.getStatus());
        }
        // attachmentPath is managed separately via the upload endpoint
        // createdBy is injected by the service layer, not from the DTO
        return record;
    }
}
