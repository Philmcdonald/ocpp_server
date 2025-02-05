/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { ChargePoint as BaseChargePoint } from "../chargepoint.js";
import * as call from "./call.js";
import * as callResult from "./call_result.js";

export class ChargePoint extends BaseChargePoint {
  private static _call = call;
  private static _callResult = callResult;
  private static _ocppVersion = "1.6";

//   constructor() {
//     super();
//   }

  // Optionally, if you want to expose these as instance methods
  public getCall() {
    return ChargePoint._call;
  }

  public getCallResult() {
    return ChargePoint._callResult;
  }

  public getOcppVersion() {
    return ChargePoint._ocppVersion;
  }
}
