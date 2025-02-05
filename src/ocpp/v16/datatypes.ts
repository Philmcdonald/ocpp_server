// Import necessary types from enums
import {
    AuthorizationStatus,
    ChargingRateUnitType,
    ChargingProfilePurposeType,
    ChargingProfileKindType,
    RecurrencyKind,
    CiStringType,
    ReadingContext,
    ValueFormat,
    Measurand,
    Phase,
    Location,
    UnitOfMeasure,
    HashAlgorithm
} from "./enums.js";

export class IdTagInfo {
    /**
     * Contains status information about an identifier. It is returned in
     * Authorize, Start Transaction and Stop Transaction responses.
     * 
     * If expiryDate is not given, the status has no end date.
     */
    constructor(
        public status: AuthorizationStatus,
        public parentIdTag?: string,
        public expiryDate?: string
    ) {}
}

export class AuthorizationData {
    /**
     * Elements that constitute an entry of a Local Authorization List update.
     */
    constructor(
        public idTag: string,
        public idTagInfo?: IdTagInfo
    ) {}
}

export class ChargingSchedulePeriod {
    constructor(
        public startPeriod: number,
        public limit: number,
        public numberPhases?: number
    ) {}
}

export class ChargingSchedule {
    constructor(
        public chargingRateUnit: ChargingRateUnitType,
        public chargingSchedulePeriod: ChargingSchedulePeriod[],
        public duration?: number,
        public startSchedule?: string,
        public minChargingRate?: number
    ) {}
}

export class ChargingProfile {
    /**
     * A ChargingProfile consists of a ChargingSchedule, describing the
     * amount of power or current that can be delivered per time interval.
     */
    constructor(
        public chargingProfileId: number,
        public stackLevel: number,
        public chargingProfilePurpose: ChargingProfilePurposeType,
        public chargingProfileKind: ChargingProfileKindType,
        public chargingSchedule: ChargingSchedule,
        public transactionId?: number,
        public recurrencyKind?: RecurrencyKind,
        public validFrom?: string,
        public validTo?: string
    ) {}
}

export class KeyValue {
    /**
     * Contains information about a specific configuration key.
     * It is returned in GetConfiguration.conf.
     */
    constructor(
        public key: string,
        public readonly: boolean,
        public value?: string
    ) {
        if (key.length > CiStringType.ciString50) {
            throw new Error("Field key is longer than 50 characters");
        }

        if (value && value.length > CiStringType.ciString500) {
            throw new Error("Field value is longer than 500 characters");
        }
    }
}

export class SampledValue {
    /**
     * Single sampled value in MeterValues. Each value can be accompanied by
     * optional fields.
     */
    constructor(
        public value: string,
        public context?: ReadingContext,
        public format?: ValueFormat,
        public measurand?: Measurand,
        public phase?: Phase,
        public location?: Location,
        public unit?: UnitOfMeasure
    ) {}
}

export class MeterValue {
    /**
     * Collection of one or more sampled values in MeterValues.req.
     * All sampled values in a MeterValue are sampled at the same point in time.
     */
    constructor(
        public timestamp: string,
        public sampledValue: SampledValue[]
    ) {}
}

export class CertificateHashData {
    /**
     * CertificateHashDataType is used by:
     * DeleteCertificate.req, GetInstalledCertificateIds.conf
     */
    constructor(
        public hashAlgorithm: HashAlgorithm,
        public issuerNameHash: string,
        public issuerKeyHash: string,
        public serialNumber: string
    ) {}
}

export class Firmware {
    /**
     * Represents a copy of the firmware that can be loaded/updated on the Charge Point.
     * FirmwareType is used by: SignedUpdateFirmware.req
     */
    constructor(
        public location: string,
        public retrieveDateTime: string,
        public signingCertificate: string,
        public installDateTime?: string,
        public signature?: string
    ) {}
}

export class LogParameters {
    /**
     * Class for detailed information the retrieval of logging entries.
     * LogParametersType is used by: GetLog.req
     */
    constructor(
        public remoteLocation: string,
        public oldestTimestamp?: string,
        public latestTimestamp?: string
    ) {}
}
