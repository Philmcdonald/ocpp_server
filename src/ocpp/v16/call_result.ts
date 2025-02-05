/* eslint-disable @typescript-eslint/no-explicit-any */
// Import necessary types from enums and datatypes
import { IdTagInfo } from "./datatypes.js";
import {
    AvailabilityStatus,
    CancelReservationStatus,
    CertificateSignedStatus,
    ChargingProfileStatus,
    ClearCacheStatus,
    ClearChargingProfileStatus,
    ConfigurationStatus,
    DataTransferStatus,
    DeleteCertificateStatus,
    GenericStatus,
    GetCompositeScheduleStatus,
    GetInstalledCertificateStatus,
    LogStatus,
    RegistrationStatus,
    RemoteStartStopStatus,
    ReservationStatus,
    ResetStatus,
    TriggerMessageStatus,
    UpdateFirmwareStatus,
    UpdateStatus,
    CertificateStatus,
    UnlockStatus,
} from "./enums.js";

// Classes for CALLRESULT messages from Central System to Charge Point

export class Authorize {
    constructor(public idTagInfo: IdTagInfo) {}
}

export class BootNotification {
    constructor(
        public currentTime: string,
        public interval: number,
        public status: RegistrationStatus
    ) {}
}

export class DiagnosticsStatusNotification {}

export class FirmwareStatusNotification {}

export class Heartbeat {
    constructor(public currentTime: string) {}
}

export class LogStatusNotification {}

export class SecurityEventNotification {}

export class SignCertificate {
    constructor(public status: GenericStatus) {}
}

export class MeterValues {}

export class StartTransaction {
    constructor(
        public transactionId: number,
        public idTagInfo: IdTagInfo
    ) {}
}

export class StatusNotification {}

export class StopTransaction {
    constructor(public idTagInfo?: IdTagInfo) {}
}

// Classes for CALLRESULT messages from Charge Point to Central System

export class CancelReservation {
    constructor(public status: CancelReservationStatus) {}
}

export class CertificateSigned {
    constructor(public status: CertificateSignedStatus) {}
}

export class ChangeAvailability {
    constructor(public status: AvailabilityStatus) {}
}

export class ChangeConfiguration {
    constructor(public status: ConfigurationStatus) {}
}

export class ClearCache {
    constructor(public status: ClearCacheStatus) {}
}

export class ClearChargingProfile {
    constructor(public status: ClearChargingProfileStatus) {}
}

export class DeleteCertificate {
    constructor(public status: DeleteCertificateStatus) {}
}

export class ExtendedTriggerMessage {
    constructor(public status: TriggerMessageStatus) {}
}

export class GetInstalledCertificateIds {
    constructor(
        public status: GetInstalledCertificateStatus,
        public certificateHashData?: Record<string, any>[]
    ) {}
}

export class GetCompositeSchedule {
    constructor(
        public status: GetCompositeScheduleStatus,
        public connectorId?: number,
        public scheduleStart?: string,
        public chargingSchedule?: Record<string, any>
    ) {}
}

export class GetConfiguration {
    constructor(
        public configurationKey?: Record<string, any>[],
        public unknownKey?: Record<string, any>[]
    ) {}
}

export class GetDiagnostics {
    constructor(public fileName?: string) {}
}

export class GetLocalListVersion {
    constructor(public listVersion: number) {}
}

export class GetLog {
    constructor(public status: LogStatus, public filename?: string) {}
}

export class InstallCertificate {
    constructor(public status: CertificateStatus) {}
}

export class RemoteStartTransaction {
    constructor(public status: RemoteStartStopStatus) {}
}

export class RemoteStopTransaction {
    constructor(public status: RemoteStartStopStatus) {}
}

export class ReserveNow {
    constructor(public status: ReservationStatus) {}
}

export class Reset {
    constructor(public status: ResetStatus) {}
}

export class SendLocalList {
    constructor(public status: UpdateStatus) {}
}

export class SetChargingProfile {
    constructor(public status: ChargingProfileStatus) {}
}

export class SignedFirmwareStatusNotification {}

export class SignedUpdateFirmware {
    constructor(public status: UpdateFirmwareStatus) {}
}

export class TriggerMessage {
    constructor(public status: TriggerMessageStatus) {}
}

export class UnlockConnector {
    constructor(public status: UnlockStatus) {}
}

export class UpdateFirmware {}

// Class for DataTransfer CALLRESULT (can originate from both Central System and Charge Point)

export class DataTransfer {
    constructor(public status: DataTransferStatus, public data?: string) {}
}
