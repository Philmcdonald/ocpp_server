export type StrEnum = Record<string, string>;

export enum Action {
    authorize = "Authorize",
    bootNotification = "BootNotification",
    cancelReservation = "CancelReservation",
    certificateSigned = "CertificateSigned",
    changeAvailability = "ChangeAvailability",
    changeConfiguration = "ChangeConfiguration",
    clearCache = "ClearCache",
    clearChargingProfile = "ClearChargingProfile",
    dataTransfer = "DataTransfer",
    deleteCertificate = "DeleteCertificate",
    diagnosticsStatusNotification = "DiagnosticsStatusNotification",
    extendedTriggerMessage = "ExtendedTriggerMessage",
    firmwareStatusNotification = "FirmwareStatusNotification",
    getCompositeSchedule = "GetCompositeSchedule",
    getConfiguration = "GetConfiguration",
    getDiagnostics = "GetDiagnostics",
    getInstalledCertificateIds = "GetInstalledCertificateIds",
    getLocalListVersion = "GetLocalListVersion",
    getLog = "GetLog",
    heartbeat = "Heartbeat",
    installCertificate = "InstallCertificate",
    logStatusNotification = "LogStatusNotification",
    meterValues = "MeterValues",
    remoteStartTransaction = "RemoteStartTransaction",
    remoteStopTransaction = "RemoteStopTransaction",
    reserveNow = "ReserveNow",
    reset = "Reset",
    securityEventNotification = "SecurityEventNotification",
    sendLocalList = "SendLocalList",
    setChargingProfile = "SetChargingProfile",
    signCertificate = "SignCertificate",
    signedFirmwareStatusNotification = "SignedFirmwareStatusNotification",
    signedUpdateFirmware = "SignedUpdateFirmware",
    startTransaction = "StartTransaction",
    statusNotification = "StatusNotification",
    stopTransaction = "StopTransaction",
    triggerMessage = "TriggerMessage",
    unlockConnector = "UnlockConnector",
    updateFirmware = "UpdateFirmware",
}

export enum AuthorizationStatus {
    accepted = "Accepted",
    blocked = "Blocked",
    expired = "Expired",
    invalid = "Invalid",
    concurrentTx = "ConcurrentTx",
}

export enum AvailabilityStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    scheduled = "Scheduled",
}

export enum AvailabilityType {
    inoperative = "Inoperative",
    operative = "Operative",
}

export enum CancelReservationStatus {
    accepted = "Accepted",
    rejected = "Rejected",
}

export enum CertificateSignedStatus {
    accepted = "Accepted",
    rejected = "Rejected",
}

export enum CertificateStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    failed = "Failed",
}

export enum CertificateUse {
    centralSystemRootCertificate = "CentralSystemRootCertificate",
    manufacturerRootCertificate = "ManufacturerRootCertificate",
}

export enum ChargePointErrorCode {
    connectorLockFailure = "ConnectorLockFailure",
    evCommunicationError = "EVCommunicationError",
    groundFailure = "GroundFailure",
    highTemperature = "HighTemperature",
    internalError = "InternalError",
    localListConflict = "LocalListConflict",
    noError = "NoError",
    otherError = "OtherError",
    overCurrentFailure = "OverCurrentFailure",
    overVoltage = "OverVoltage",
    powerMeterFailure = "PowerMeterFailure",
    powerSwitchFailure = "PowerSwitchFailure",
    readerFailure = "ReaderFailure",
    resetFailure = "ResetFailure",
    underVoltage = "UnderVoltage",
    weakSignal = "WeakSignal",
}

export enum ChargePointStatus {
    available = "Available",
    preparing = "Preparing",
    charging = "Charging",
    suspendedEvse = "SuspendedEVSE",
    suspendedEv = "SuspendedEV",
    finishing = "Finishing",
    reserved = "Reserved",
    unavailable = "Unavailable",
    faulted = "Faulted",
}

export enum ChargingProfileKindType {
    absolute = "Absolute",
    recurring = "Recurring",
    relative = "Relative",
}

export enum ChargingProfilePurposeType {
    chargePointMaxProfile = "ChargePointMaxProfile",
    txDefaultProfile = "TxDefaultProfile",
    txProfile = "TxProfile",
}

export enum ChargingProfileStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    notSupported = "NotSupported",
}

export enum ChargingRateUnitType {
    watts = "W",
    amps = "A",
}

export enum CiStringType {
    ciString20 = 20,
    ciString25 = 25,
    ciString50 = 50,
    ciString255 = 255,
    ciString500 = 500
}

export enum ClearCacheStatus {
    accepted = "Accepted",
    rejected = "Rejected",
}

export enum ClearChargingProfileStatus {
    accepted = "Accepted",
    unknown = "Unknown",
}

export enum ConfigurationStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    rebootRequired = "RebootRequired",
    notSupported = "NotSupported",
}

export enum DataTransferStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    unknownMessageId = "UnknownMessageId",
    unknownVendorId = "UnknownVendorId",
}

export enum DeleteCertificateStatus {
    accepted = "Accepted",
    failed = "Failed",
    notFound = "NotFound",
}

export enum DiagnosticsStatus {
    idle = "Idle",
    uploaded = "Uploaded",
    uploadFailed = "UploadFailed",
    uploading = "Uploading",
}

export enum FirmwareStatus {
    downloaded = "Downloaded",
    downloadFailed = "DownloadFailed",
    downloading = "Downloading",
    idle = "Idle",
    installationFailed = "InstallationFailed",
    installing = "Installing",
    installed = "Installed",
    downloadScheduled = "DownloadScheduled",
    downloadPaused = "DownloadPaused",
    installRebooting = "InstallRebooting",
    installScheduled = "InstallScheduled",
    installVerificationFailed = "InstallVerificationFailed",
    invalidSignature = "InvalidSignature",
    signatureVerified = "SignatureVerified",
}

export enum GenericStatus {
    accepted = "Accepted",
    rejected = "Rejected",
}

export enum GetCompositeScheduleStatus {
    accepted = "Accepted",
    rejected = "Rejected",
}

export enum GetInstalledCertificateStatus {
    accepted = "Accepted",
    notFound = "NotFound",
}

export enum HashAlgorithm {
    sha256 = "SHA256",
    sha384 = "SHA384",
    sha512 = "SHA512",
}

export enum Location {
    inlet = "Inlet",
    outlet = "Outlet",
    body = "Body",
    cable = "Cable",
    ev = "EV",
}

export enum Log {
    diagnosticsLog = "DiagnosticsLog",
    securityLog = "SecurityLog",
}

export enum LogStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    acceptedCanceled = "AcceptedCanceled",
}

export enum Measurand {
    currentExport = "Current.Export",
    currentImport = "Current.Import",
    currentOffered = "Current.Offered",
    energyActiveExportRegister = "Energy.Active.Export.Register",
    energyActiveImportRegister = "Energy.Active.Import.Register",
    energyReactiveExportRegister = "Energy.Reactive.Export.Register",
    energyReactiveImportRegister = "Energy.Reactive.Import.Register",
    energyActiveExportInterval = "Energy.Active.Export.Interval",
    energyActiveImportInterval = "Energy.Active.Import.Interval",
    energyReactiveExportInterval = "Energy.Reactive.Export.Interval",
    energyReactiveImportInterval = "Energy.Reactive.Import.Interval",
    frequency = "Frequency",
    powerActiveExport = "Power.Active.Export",
    powerActiveImport = "Power.Active.Import",
    powerFactor = "Power.Factor",
    powerOffered = "Power.Offered",
    powerReactiveExport = "Power.Reactive.Export",
    powerReactiveImport = "Power.Reactive.Import",
    rpm = "RPM",
    soc = "SoC",
    temperature = "Temperature",
    voltage = "Voltage",
}

export enum MessageTrigger {
    bootNotification = "BootNotification",
    firmwareStatusNotification = "FirmwareStatusNotification",
    heartbeat = "Heartbeat",
    meterValues = "MeterValues",
    statusNotification = "StatusNotification",
    diagnosticsStatusNotification = "DiagnosticsStatusNotification",
    logStatusNotification = "LogStatusNotification",
    signChargePointCertificate = "SignChargePointCertificate",
}

export enum Phase {
    l1 = "L1",
    l2 = "L2",
    l3 = "L3",
    n = "N",
    l1N = "L1-N",
    l2N = "L2-N",
    l3N = "L3-N",
    l1L2 = "L1-L2",
    l2L3 = "L2-L3",
    l3L1 = "L3-L1",
}

export enum ReadingContext {
    interruptionBegin = "Interruption.Begin",
    interruptionEnd = "Interruption.End",
    other = "Other",
    sampleClock = "Sample.Clock",
    samplePeriodic = "Sample.Periodic",
    transactionBegin = "Transaction.Begin",
    transactionEnd = "Transaction.End",
    trigger = "Trigger",
}

export enum Reason {
    emergencyStop = "EmergencyStop",
    evDisconnected = "EVDisconnected",
    hardReset = "HardReset",
    local = "Local",
    other = "Other",
    powerLoss = "PowerLoss",
    reboot = "Reboot",
    remote = "Remote",
    softReset = "SoftReset",
    unlockCommand = "UnlockCommand",
    deAuthorized = "DeAuthorized",
}

export enum RecurrencyKind {
    daily = "Daily",
    weekly = "Weekly",
}

export enum RegistrationStatus {
    accepted = "Accepted",
    pending = "Pending",
    rejected = "Rejected",
}

export enum RemoteStartStopStatus {
    accepted = "Accepted",
    rejected = "Rejected"
}

export enum ReservationStatus {
    accepted = "Accepted",
    faulted = "Faulted",
    occupied = "Occupied",
    rejected = "Rejected",
    unavailable = "Unavailable",
}

export enum ResetStatus {
    accepted = "Accepted",
    rejected = "Rejected"
}

export enum ResetType {
    hard = "Hard",
    soft = "Soft"
}

export enum TriggerMessageStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    notImplemented = "NotImplemented"
}

export enum UnitOfMeasure {
    wh = "Wh",
    kwh = "kWh",
    varh = "varh",
    kvarh = "kvarh",
    w = "W",
    kw = "kW",
    va = "VA",
    kva = "kVA",
    var = "var",
    kvar = "kvar",
    a = "A",
    v = "V",
    celsius = "Celsius",
    fahrenheit = "Fahrenheit",
    k = "K",
    percent = "Percent"
}

export enum UnlockStatus {
    unlocked = "Unlocked",
    unlockFailed = "UnlockFailed",
    notSupported = "NotSupported"
}

export enum UpdateFirmwareStatus {
    accepted = "Accepted",
    rejected = "Rejected",
    acceptedCanceled = "AcceptedCanceled",
    invalidCertificate = "InvalidCertificate",
    revokedCertificate = "RevokedCertificate"
}

export enum UploadLogStatus {
    badMessage = "BadMessage",
    idle = "Idle",
    notSupportedOperation = "NotSupportedOperation",
    permissionDenied = "PermissionDenied",
    uploaded = "Uploaded",
    uploadFailure = "UploadFailure",
    uploading = "Uploading"
}

export enum UpdateStatus {
    accepted = "Accepted",
    failed = "Failed",
    notSupported = "NotSupported",
    versionMismatch = "VersionMismatch"
}

export enum UpdateType {
    differential = "Differential",
    full = "Full"
}

export enum ValueFormat {
    raw = "Raw",
    signedData = "SignedData"
}