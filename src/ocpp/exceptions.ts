/* eslint-disable @typescript-eslint/no-explicit-any */
// Base class for all OCPP errors. It should only be subclassed.
export class OCPPError extends Error {
    static defaultDescription: string = "";
    details: Record<string, any>;
    static code: string;
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || OCPPError.defaultDescription);
      this.name = this.constructor.name;
      this.details = details || {};
    }
  
    equals(other: any): boolean {
      if (other instanceof OCPPError) {
        return (
          this.message === other.message &&
          JSON.stringify(this.details) === JSON.stringify(other.details)
        );
      }
      return false;
    }
  
    toString(): string {
      return `${this.name}: ${this.message}, ${JSON.stringify(this.details)}`;
    }
  }
  
  export class NotImplementedError extends OCPPError {
    static code: string = "NotImplemented";
    static defaultDescription: string = "Request Action is recognized but not supported by the receiver";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || NotImplementedError.defaultDescription, details);
    }
  }
  
  export class NotSupportedError extends OCPPError {
    static code: string = "NotSupported";
    static defaultDescription: string = "Requested Action is not known by receiver";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || NotSupportedError.defaultDescription, details);
    }
  }
  
  export class InternalError extends OCPPError {
    static code: string = "InternalError";
    static defaultDescription: string = "An internal error occurred and the receiver was not able to process the requested Action successfully";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || InternalError.defaultDescription, details);
    }
  }
  
  export class ProtocolError extends OCPPError {
    static code: string = "ProtocolError";
    static defaultDescription: string = "Payload for Action is incomplete";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || ProtocolError.defaultDescription, details);
    }
  }
  
  export class SecurityError extends OCPPError {
    static code: string = "SecurityError";
    static defaultDescription: string = "During the processing of Action a security issue occurred preventing receiver from completing the Action successfully";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || SecurityError.defaultDescription, details);
    }
  }
  
  export class FormatViolationError extends OCPPError {
    static code: string = "FormatViolation";
    static defaultDescription: string = "Payload for Action is syntactically incorrect or structure for Action";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || FormatViolationError.defaultDescription, details);
    }
  }
  
  export class FormationViolationError extends OCPPError {
    static code: string = "FormationViolation";
    static defaultDescription: string = "Payload for Action is syntactically incorrect or structure for Action";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || FormationViolationError.defaultDescription, details);
    }
  }
  
  export class PropertyConstraintViolationError extends OCPPError {
    static code: string = "PropertyConstraintViolation";
    static defaultDescription: string = "Payload is syntactically correct but at least one field contains an invalid value";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || PropertyConstraintViolationError.defaultDescription, details);
    }
  }
  
  export class OccurenceConstraintViolationError extends OCPPError {
    static code: string = "OccurenceConstraintViolation";
    static defaultDescription: string = "Payload for Action is syntactically correct but at least one of the fields violates occurence constraints";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || OccurenceConstraintViolationError.defaultDescription, details);
    }
  }
  
  export class OccurrenceConstraintViolationError extends OCPPError {
    static code: string = "OccurrenceConstraintViolation";
    static defaultDescription: string = "Payload for Action is syntactically correct but at least one of the fields violates occurence constraints";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || OccurrenceConstraintViolationError.defaultDescription, details);
    }
  }
  
  export class TypeConstraintViolationError extends OCPPError {
    static code: string = "TypeConstraintViolation";
    static defaultDescription: string = "Payload for Action is syntactically correct but at least one of the fields violates data type constraints (e.g. “somestring”: 12)";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || TypeConstraintViolationError.defaultDescription, details);
    }
  }
  
  export class GenericError extends OCPPError {
    static code: string = "GenericError";
    static defaultDescription: string = "Any other error not all other OCPP defined errors";
  
    constructor(description?: string, details?: Record<string, any>) {
      super(description || GenericError.defaultDescription, details);
    }
  }
  
  export class ValidationError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "ValidationError";
    }
  }
  
  export class UnknownCallErrorCodeError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "UnknownCallErrorCodeError";
    }
  }
  