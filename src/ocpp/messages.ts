/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Ajv, ValidateFunction } from 'ajv';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FormationViolationError, FormatViolationError, GenericError, InternalError, NotImplementedError, NotSupportedError, OccurenceConstraintViolationError, OccurrenceConstraintViolationError, OCPPError, PropertyConstraintViolationError, ProtocolError, SecurityError, TypeConstraintViolationError, UnknownCallErrorCodeError, ValidationError } from './exceptions.js';

// Types
type MessagePayload = Record<string, any>;
// type ErrorDetails = Record<string, any>;
type ParseFloatFunction = (value: string) => number;
type ValidatorCache = Map<string, ValidateFunction>;

// Interfaces
interface OCPPMessage {
    toJson(): string;
}

// Enums
export enum MessageTypeId {
    Call = 2,
    CallResult = 3,
    CallError = 4
}

// Configure AJV instance
const ajv = new Ajv({
    // validateFormats: true,

    // strict: false,
    allErrors: true
});

// Cache for validators
const validators: ValidatorCache = new Map();

// Custom JSON Encoder for Decimal values
class DecimalEncoder {
    static encode(obj: any): string {
        return JSON.stringify(obj, (_, value) => {
            if (typeof value === 'number') {
                return Number(value.toFixed(1));
            }
            return value;
        });
    }
}

// Message Classes
export class Call implements OCPPMessage {
    public static readonly messageTypeId = MessageTypeId.Call;

    constructor(
        public uniqueId: string,
        public action: string,
        public payload: MessagePayload
    ) {}

    toJson(): string {
        return DecimalEncoder.encode([
            Call.messageTypeId,
            this.uniqueId,
            this.action,
            this.payload
        ]);
    }

    createCallResult(payload: MessagePayload): CallResult {
        const callResult = new CallResult(this.uniqueId, payload);
        callResult.action = this.action;
        return callResult;
    }

    createCallError(exception: Error | OCPPError): CallError {
        let errorCode = "InternalError";
        let errorDescription = "An unexpected error occurred.";
        let errorDetails = {};

        if (exception instanceof OCPPError) {
            errorCode = (exception.constructor as typeof OCPPError).code;
            errorDescription = exception.cause as any;
            errorDetails = exception.details;
        }

        return new CallError(
            this.uniqueId,
            errorCode,
            errorDescription,
            errorDetails
        );
    }
}

export class CallResult implements OCPPMessage {
    public static readonly messageTypeId = MessageTypeId.CallResult;
    public action?: string;

    constructor(
        public uniqueId: string,
        public payload: MessagePayload
    ) {}

    toJson(): string {
        return DecimalEncoder.encode([
            CallResult.messageTypeId,
            this.uniqueId,
            this.payload
        ]);
    }
}

export class CallError {
    static messageTypeId = MessageTypeId.CallError;

    constructor(
        public uniqueId: string,
        public errorCode: string,
        public errorDescription: string,
        public errorDetails?: Record<string, any>
    ) {}

    toJSON(): string {
        return JSON.stringify([
            CallError.messageTypeId,
            this.uniqueId,
            this.errorCode,
            this.errorDescription,
            this.errorDetails
        ]);
    }

    toException(): OCPPError {
        const errorClasses = [
            NotImplementedError,
            NotSupportedError,
            InternalError,
            ProtocolError,
            SecurityError,
            FormatViolationError,
            FormationViolationError,
            PropertyConstraintViolationError,
            OccurenceConstraintViolationError,
            OccurrenceConstraintViolationError,
            TypeConstraintViolationError,
            GenericError
        ];

        for (const errorClass of errorClasses) {
            if (errorClass.code === this.errorCode) {
                return new errorClass(this.errorDescription, this.errorDetails);
            }
        }

        throw new UnknownCallErrorCodeError(
            `Error code '${this.errorCode}' is not defined by the OCPP specification`
        );
    }
}

/**
 * Get validator for specific OCPP message type and action
 */
export function getValidator(
    messageTypeId: MessageTypeId,
    action: string,
    ocppVersion: string,
    parseFloat: ParseFloatFunction = Number.parseFloat
): ValidateFunction {
    if (!['1.6', '2.0', '2.0.1'].includes(ocppVersion)) {
        throw new Error('Invalid OCPP version');
    }

    const schemasDir = `v${ocppVersion.replace('.', '')}`;
    let schemaName = action;

    // Add more detailed logging
    console.log('Schema Resolution Details:', {
        messageTypeId,
        action,
        ocppVersion,
        schemasDir,
        __dirname,  // This will show the base directory
        fullAttemptedPath: join(__dirname, schemasDir, 'schemas', `${schemaName}.json`)
    });

    // Adjust schema name based on message type and OCPP version
    if (messageTypeId === MessageTypeId.CallResult) {
        schemaName += 'Response';
    } else if (messageTypeId === MessageTypeId.Call && ['2.0', '2.0.1'].includes(ocppVersion)) {
        schemaName += 'Request';
    }

    if (ocppVersion === '2.0') {
        schemaName += '_v1p0';
    }

    const cacheKey = `${schemaName}_${ocppVersion}`;
    
    // Return cached validator if available
    const cachedValidator = validators.get(cacheKey);
    if (cachedValidator) {
        return cachedValidator;
    }

    try {
        // Load schema file
        const schemaPath = join(__dirname, schemasDir, 'schemas', `${schemaName}.json`);
        const schemaContent = readFileSync(schemaPath, 'utf-8');
        const schema = JSON.parse(schemaContent, (_, value) => {
            if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                return parseFloat(value);
            }
            return value;
        });

        // Compile schema
        const validator = ajv.compile(schema);
        validators.set(cacheKey, validator);
        return validator;

    } catch (error) {
        throw new NotImplementedError(`Failed to load or compile schema for action: ${action}`);
    }
}

/**
 * Validate payload against OCPP schema
 */
export async function validatePayload(
    message: Call | CallResult,
    ocppVersion: string
): Promise<void> {
    // Check if message is of correct type
    if (!(message instanceof Call || message instanceof CallResult)) {
        throw new ValidationError(
            "Payload can't be validated because message type is invalid. " +
            `It's '${typeof message}', but it should be either 'Call' or 'CallResult'.`
        );
    }

    try {
        let validator: ValidateFunction;
        let payload = { ...message.payload };

        // Special handling for OCPP 1.6 float precision
        if (ocppVersion === '1.6' && 
            ((message instanceof Call && 
              ['SetChargingProfile', 'RemoteStartTransaction'].includes(message.action)) ||
             (message instanceof CallResult && 
              message.action === 'GetCompositeSchedule'))) {
            
            // Use decimal precision for specific messages
            validator = getValidator(
                message instanceof Call ? MessageTypeId.Call : MessageTypeId.CallResult,
                message.action,
                ocppVersion,
                (value: string) => Number(Number(value).toFixed(1))
            );

            // Convert payload numbers to fixed precision
            payload = JSON.parse(
                JSON.stringify(payload, (_, value) => {
                    if (typeof value === 'number') {
                        return Number(value.toFixed(1));
                    }
                    return value;
                })
            );
        } else {
            validator = getValidator(
                message instanceof Call ? MessageTypeId.Call : MessageTypeId.CallResult,
                message.action,
                ocppVersion
            );
        }

        const valid = await validator(payload);

        if (!valid) {
            const errors = validator.errors || [];
            
            for (const error of errors) {
                switch (error.keyword) {
                    case 'type':
                        throw new TypeConstraintViolationError(error.message || 'Type validation failed');
                    
                    case 'additionalProperties':
                        throw new FormatViolationError(
                            error.message || 'Additional properties not allowed');
                    
                    case 'required':
                        throw new ProtocolError(`OCPP message hasn't the correct format. It should be a list, but got '${typeof payload}' instead`);
                    
                    case 'maxLength':
                        throw new TypeConstraintViolationError(error.message || 'Maximum length exceeded');
                    
                    default:
                        throw new FormatViolationError(`Payload '${JSON.stringify(payload)}' for action ` +
                                  `'${message.action}' is not valid: ${error.message || 'Validation failed'}`);
                }
            }
        }
    } catch (error) {
        if (error instanceof OCPPError) {
            throw error;
        }
        
        throw new NotImplementedError(`Failed to validate action: ${message.action}`);
    }
}

// Helper functions for message handling
export function unpack(msg: string): Call | CallResult | CallError {
    let parsed: any[];
    
    try {
        parsed = JSON.parse(msg);
    } catch (error) {
        throw new FormatViolationError('Message is not valid JSON');
    }

    if (!Array.isArray(parsed)) {
        throw new ProtocolError(`OCPP message hasn't the correct format. It should be a list, but got '${typeof parsed}' instead`);
    }

    const [messageTypeId, ...rest] = parsed;

    switch (messageTypeId) {
        case MessageTypeId.Call:
            if (rest.length < 3) throw new ProtocolError('Message is missing elements');
            return new Call(rest[0], rest[1], rest[2]);
        
        case MessageTypeId.CallResult:
            if (rest.length < 2) throw new ProtocolError('Message is missing elements');
            return new CallResult(rest[0], rest[1]);
        
        case MessageTypeId.CallError:
            if (rest.length < 4) throw new ProtocolError('Message is missing elements');
            return new CallError(rest[0], rest[1], rest[2], rest[3]);
        
        default:
            throw new PropertyConstraintViolationError(`MessageTypeId '${messageTypeId}' isn't valid`);
    }
}

export function pack(msg: OCPPMessage): string {
    return msg.toJson();
}

// Utility function to process decimal numbers
// function processDecimals(obj: any): any {
//     if (typeof obj !== 'object' || obj === null) {
//         return obj;
//     }

//     if (Array.isArray(obj)) {
//         return obj.map(processDecimals);
//     }

//     const result: Record<string, any> = {};
//     for (const [key, value] of Object.entries(obj)) {
//         if (typeof value === 'number') {
//             result[key] = Number(value.toFixed(1));
//         } else if (typeof value === 'object') {
//             result[key] = processDecimals(value);
//         } else {
//             result[key] = value;
//         }
//     }

//     return result;
// }