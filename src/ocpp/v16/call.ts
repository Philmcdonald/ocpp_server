/* eslint-disable @typescript-eslint/no-explicit-any */
// Import necessary types from enums and datatypes
import {
    AvailabilityType,
    ChargingProfilePurposeType,
    MessageTrigger,
    ChargingRateUnitType,
    CertificateUse,
    Log,
    ResetType,
    UpdateType,
    DiagnosticsStatus,
    FirmwareStatus,
    UploadLogStatus,
    ChargePointErrorCode,
    ChargePointStatus,
    Reason,
} from "./enums.js";

export class CancelReservation {
    constructor(public reservationId: number) {}
}

export class CertificateSigned {
    constructor(public certificateChain: string) {}
}

export class ChangeAvailability {
    constructor(public connectorId: number, public type: AvailabilityType) {}
}

export class ChangeConfiguration {
    constructor(public key: string, public value: string) {}
}

export class ClearCache {}

export class ClearChargingProfile {
    constructor(
        public id?: number,
        public connectorId?: number,
        public chargingProfilePurpose?: ChargingProfilePurposeType,
        public stackLevel?: number
    ) {}
}

export class DeleteCertificate {
    constructor(public certificateHashData: Record<string, any>) {}
}

export class ExtendedTriggerMessage {
    constructor(public requestedMessage: MessageTrigger, public connectorId?: number) {}
}

export class GetCompositeSchedule {
    constructor(
        public connectorId: number,
        public duration: number,
        public chargingRateUnit?: ChargingRateUnitType
    ) {}
}

export class GetConfiguration {
    constructor(public key?: string[]) {}
}

export class GetDiagnostics {
    constructor(
        public location: string,
        public retries?: number,
        public retryInterval?: number,
        public startTime?: string,
        public stopTime?: string
    ) {}
}

export class GetInstalledCertificateIds {
    constructor(public certificateType: CertificateUse) {}
}

export class GetLocalListVersion {}

export class GetLog {
    constructor(
        public log: Record<string, any>,
        public logType: Log,
        public requestId: number,
        public retries?: number,
        public retryInterval?: number
    ) {}
}

export class InstallCertificate {
    constructor(public certificateType: CertificateUse, public certificate: string) {}
}

export class RemoteStartTransaction {
    constructor(
        public idTag: string,
        public connectorId?: number,
        public chargingProfile?: Record<string, any>
    ) {}
}

export class RemoteStopTransaction {
    constructor(public transactionId: number) {}
}

export class ReserveNow {
    constructor(
        public connectorId: number,
        public expiryDate: string,
        public idTag: string,
        public reservationId: number,
        public parentIdTag?: string
    ) {}
}

export class Reset {
    constructor(public type: ResetType) {}
}

export class SendLocalList {
    constructor(
        public listVersion: number,
        public updateType: UpdateType,
        public localAuthorizationList: Record<string, any>[] = []
    ) {}
}

export class SetChargingProfile {
    constructor(
        public connectorId: number,
        public csChargingProfiles: Record<string, any>
    ) {}
}

export class SignedUpdateFirmware {
    constructor(
        public requestId: number,
        public firmware: Record<string, any>,
        public retries?: number,
        public retryInterval?: number
    ) {}
}

export class TriggerMessage {
    constructor(public requestedMessage: MessageTrigger, public connectorId?: number) {}
}

export class UnlockConnector {
    constructor(public connectorId: number) {}
}

export class UpdateFirmware {
    constructor(
        public location: string,
        public retrieveDate: string,
        public retries?: number,
        public retryInterval?: number
    ) {}
}

// Classes for messages from Charge Point to Central System

export class Authorize {
    constructor(public idTag: string) {}
}

export class BootNotification {
    constructor(
        public chargePointModel: string,
        public chargePointVendor: string,
        public chargeBoxSerialNumber?: string,
        public chargePointSerialNumber?: string,
        public firmwareVersion?: string,
        public iccid?: string,
        public imsi?: string,
        public meterSerialNumber?: string,
        public meterType?: string
    ) {}
}

export class DiagnosticsStatusNotification {
    constructor(public status: DiagnosticsStatus) {}
}

export class FirmwareStatusNotification {
    constructor(public status: FirmwareStatus) {}
}

export class Heartbeat {}

export class LogStatusNotification {
    constructor(public status: UploadLogStatus, public requestId: number) {}
}

export class MeterValues {
    constructor(
        public connectorId: number,
        public meterValue: Record<string, any>[] = [],
        public transactionId?: number
    ) {}
}

export class SecurityEventNotification {
    constructor(
        public type: string,
        public timestamp: string,
        public techInfo?: string
    ) {}
}

export class SignCertificate {
    constructor(public csr: string) {}
}

export class SignedFirmwareStatusNotification {
    constructor(public status: FirmwareStatus, public requestId: number) {}
}

export class StartTransaction {
    constructor(
        public connectorId: number,
        public idTag: string,
        public meterStart: number,
        public timestamp: string,
        public reservationId?: number
    ) {}
}

export class StopTransaction {
    constructor(
        public meterStop: number,
        public timestamp: string,
        public transactionId: number,
        public reason?: Reason,
        public idTag?: string,
        public transactionData?: Record<string, any>[]
    ) {}
}

export class StatusNotification {
    constructor(
        public connectorId: number,
        public errorCode: ChargePointErrorCode,
        public status: ChargePointStatus,
        public timestamp?: string,
        public info?: string,
        public vendorId?: string,
        public vendorErrorCode?: string
    ) {}
}

export class DataTransfer {
    constructor(
        public vendorId: string,
        public messageId?: string,
        public data?: string
    ) {}
}
