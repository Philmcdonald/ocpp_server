/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { v4 as uuid } from 'uuid';
import { Call, CallError, CallResult, MessageTypeId as MessageType, unpack, validatePayload } from './messages.js';
import { NotImplementedError, NotSupportedError, OCPPError } from './exceptions.js';
import { createRouteMap } from './routing.js';
import { Logger } from 'winston';

type OCPPMessage = Call | CallResult | CallError;
// type MessagePayload = Record<string, any>;

function removeNulls(data: any): any {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    if (Array.isArray(data)) {
        return data
            .filter(v => v !== null)
            .map(v => removeNulls(v));
    }

    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
        if (v !== null) {
            result[k] = removeNulls(v);
        }
    }
    return result;
}

function raiseKeyError(action: string, version: string): never {
    if (version === '1.6') {
        try {
            // Assuming v16Action exists in your codebase
            // v16Action[action];
            throw new NotImplementedError(`No handler for ${action} registered.`);
        } catch {
            throw new NotSupportedError(`${action} not supported by OCPP${version}.`);
        }
    } else if (version === '2.0' || version === '2.0.1') {
        try {
            // Assuming v201Action exists in your codebase
            // v201Action[action];
            throw new NotImplementedError(`No handler for ${action} registered.`);
        } catch {
            throw new NotSupportedError(`${action} not supported by OCPP${version}.`);
        }
    }
    throw new Error('Invalid version');
}

interface Connection {
    recv(): Promise<string>;
    send(message: string): Promise<void>;
}

interface CallResultConstructors {
    [key: string]: new (payload: any) => any;
}

export class ChargePoint {
    private id: string;
    private responseTimeout: number;
    private connection: Connection;
    private routeMap: Record<string, any>;
    private callLock: AsyncLock;
    private responseQueue: AsyncQueue<any>;
    private uniqueIdGenerator: () => string;
    private logger: Logger;
    private ocppVersion: string;
    private _call_result: CallResultConstructors;  // Added this property

    constructor(
        id: string,
        connection: Connection,
        responseTimeout: number = 30,
        logger: Logger
    ) {
        this.id = id;
        this.responseTimeout = responseTimeout;
        this.connection = connection;
        this.routeMap = createRouteMap({});
        this.callLock = new AsyncLock();
        this.responseQueue = new AsyncQueue();
        this.uniqueIdGenerator = uuid;
        this.logger = logger;
        this._call_result = {};
    }

    async start(): Promise<void> {
        while (true) {
            const message = await this.connection.recv();
            this.logger.info(`${this.id}: receive message ${message}`);
            await this.routeMessage(message);
        }
    }

    async routeMessage(rawMsg: string): Promise<void> {
        try {
            const msg = unpack(rawMsg) as OCPPMessage;

            if ('messageTypeId' in msg && msg.messageTypeId === MessageType.Call) {
                try {
                    await this.handleCall(msg as Call);
                } catch (e) {
                    if (e instanceof OCPPError) {
                        this.logger.error(`Error while handling request '${msg}'`);
                        const response = (msg as Call).createCallError(e).toJSON();
                        await this.send(response);
                    }
                }
            } else if (
                'messageTypeId' in msg && 
                (msg.messageTypeId === MessageType.CallResult || 
                 msg.messageTypeId === MessageType.CallError)
            ) {
                this.responseQueue.put(msg);
            }
        } catch (e) {
            if (e instanceof OCPPError) {
                this.logger.error(
                    `Unable to parse message: '${rawMsg}', it doesn't seem to be valid OCPP: ${e}`
                );
            }
            return;
        }
    }

    async handleCall(msg: any): Promise<any> {
        let handlers;
        try {
            handlers = this.routeMap[msg.action];
        } catch {
            raiseKeyError(msg.action, this.ocppVersion);
            return;
        }

        if (!handlers._skip_schema_validation) {
            await validatePayload(msg, this.ocppVersion);
        }

        let handler;
        try {
            handler = handlers._on_action;
        } catch {
            raiseKeyError(msg.action, this.ocppVersion);
        }

        let response;
        try {
            const parameters = handler.toString()
                .match(/\((.*?)\)/)[1]
                .split(',')
                .map(param => param.trim());
            
            const callUniqueIdRequired = parameters.includes('callUniqueId');

            if (callUniqueIdRequired) {
                response = await handler({
                    ...msg.payload,
                    callUniqueId: msg.uniqueId
                });
            } else {
                response = await handler(msg.payload);
            }
        } catch (e) {
            this.logger.error(`Error while handling request '${msg}'`);
            const response = msg.createCallError(e).toJson();
            await this.send(response);
            return;
        }

        const responsePayload = removeNulls(response);
        const finalResponse = msg.createCallResult(responsePayload);

        if (!handlers._skip_schema_validation) {
            await validatePayload(finalResponse, this.ocppVersion);
        }

        await this.send(finalResponse.toJson());

        try {
            const afterHandler = handlers._after_action;
            const parameters = afterHandler.toString()
                .match(/\((.*?)\)/)[1]
                .split(',')
                .map(param => param.trim());
            
            const callUniqueIdRequired = parameters.includes('callUniqueId');

            if (callUniqueIdRequired) {
                response = afterHandler({
                    ...msg.payload,
                    callUniqueId: msg.uniqueId
                });
            } else {
                response = afterHandler(msg.payload);
            }

            if (response instanceof Promise) {
                // Create task to avoid blocking when making a call inside the after handler
                Promise.resolve(response);
            }
        } catch {
            // '_after_action' hooks are not required
            // Therefore ignore exception when no '_after_action' hook is installed
        }

        return response;
    }

    async call(
        payload: any,
        suppress: boolean = true,
        uniqueId?: string,
        skipSchemaValidation: boolean = false
    ): Promise<any> {
        const msgUniqueId = uniqueId ?? this.uniqueIdGenerator();
        const actionName = payload.constructor.name;

        const call = new Call(
            msgUniqueId,
            actionName,
            removeNulls(payload)
        );

        if (!skipSchemaValidation) {
            await validatePayload(call, this.ocppVersion);
        }

        let response;
        await this.callLock.acquire();
        try {
            await this.send(call.toJson());
            try {
                response = await this.getSpecificResponse(
                    call.uniqueId,
                    this.responseTimeout
                );
            } catch (e) {
                if (e instanceof Error) {
                    throw new Error(
                        `Waited ${this.responseTimeout}s for response on ${call.toJson()}.`
                    );
                }
            }
        } finally {
            this.callLock.release();
        }

        if (response.messageTypeId === MessageType.CallError) {
            this.logger.warning(`Received a CALLError: ${response}`);
            if (suppress) {
                return;
            }
            throw response.toException();
        } else if (!skipSchemaValidation) {
            response.action = call.action;
            await validatePayload(response, this.ocppVersion);
        }

        // Create the correct Payload instance based on received payload
        const cls = this._call_result[payload.constructor.name];
        return new cls(response.payload);
    }

    private async getSpecificResponse(uniqueId: string, timeout: number): Promise<any> {
        const waitUntil = Date.now() + timeout * 1000;
        
        try {
            const response = await Promise.race([
                this.responseQueue.get(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), timeout * 1000)
                )
            ]);

            if (response.uniqueId === uniqueId) {
                return response;
            }

            this.logger.error(`Ignoring response with unknown unique id: ${response}`);
            const timeoutLeft = waitUntil - Date.now();

            if (timeoutLeft < 0) {
                throw new Error('Timeout');
            }

            return this.getSpecificResponse(uniqueId, timeoutLeft / 1000);
        } catch (e) {
            throw e;
        }
    }

    private async send(message: string): Promise<void> {
        this.logger.info(`${this.id}: send ${message}`);
        await this.connection.send(message);
    }
}

class AsyncLock {
    private locked: boolean = false;
    private queue: (() => void)[] = [];

    async acquire(): Promise<void> {
        if (!this.locked) {
            this.locked = true;
            return;
        }

        return new Promise<void>(resolve => {
            this.queue.push(resolve);
        });
    }

    release(): void {
        if (this.queue.length > 0) {
            const resolve = this.queue.shift()!;
            resolve();
        } else {
            this.locked = false;
        }
    }
}

class AsyncQueue<T> {
    private queue: T[] = [];
    private waiters: ((value: T) => void)[] = [];

    put(item: T): void {
        if (this.waiters.length > 0) {
            const resolve = this.waiters.shift()!;
            resolve(item);
        } else {
            this.queue.push(item);
        }
    }

    async get(): Promise<T> {
        if (this.queue.length > 0) {
            return this.queue.shift()!;
        }

        return new Promise<T>(resolve => {
            this.waiters.push(resolve);
        });
    }
}