/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

// Define OCPP action handlers
export const routes = {
    BootNotification: {
      handler: async (payload: any) => {
        console.log("BootNotification payload received:", payload);
        return {
          status: "Accepted",
          currentTime: new Date().toISOString(),
          interval: 300,
        };
      },
    },
    Authorize: {
      handler: async (payload: any) => {
        console.log("Authorize payload received:", payload);
        return {
          status: "Accepted"
        };
      },
    },
    Heartbeat: {
      handler: async (_payload: any) => {
        console.log("Heartbeat received\n");
        return { currentTime: new Date().toISOString() };
      },
    },
    StatusNotification: {
      handler: async (_payload: any) => {
        console.log("StatusNotification received\n", _payload);

        if (_payload.status === "Preparing") {
            // Send Remote Start Transaction
        }
        return {};
      },
    },
    StartTransaction: {
      handler: async (_payload: any) => {
        console.log("StartTransaction received\n", _payload);
        return {
          idTagInfo: {
            parentIdTag: _payload?.idTag,
            status: "Accepted"
          },
          transactionId: _payload?.idTag?.split('')?.reverse().join(''),
        };
      },
    },
    StopTransaction: {
      handler: async (_payload: any) => {
        console.log("StopTransaction received\n", _payload);
        return {
            status: "Accepted",
            transactionId: Math.floor(Math.random() * 1000000),
            currentTime: new Date().toISOString(),
        };
      },
    },
    DataTransfer: {
      handler: async (_payload: any) => {
        console.log("DataTransfer received\n", _payload);
        return {
            status: "Accepted"
        };
      },
    },
    MeterValues: {
      handler: async (_payload: any) => {
        console.log("MeterValues received\n", _payload);
        return {};
      },
    },
    DiagnosticsStatusNotification: {
      handler: async (_payload: any) => {
        console.log("DiagnosticsStatusNotification received\n", _payload);
        return {};
      },
    },
    FirmwareStatusNotification: {
      handler: async (_payload: any) => {
        console.log("FirmwareStatusNotification received\n", _payload);
        return {};
      },
    },
  };