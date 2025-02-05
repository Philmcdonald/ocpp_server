/* eslint-disable @typescript-eslint/no-explicit-any */
type HandlerFunction = (payload: any) => any;

export interface RouteConfig {
  handler: HandlerFunction;
  skipSchemaValidation?: boolean;
}

export function createRouteMap(routes: Record<string, RouteConfig>): Map<string, RouteConfig> {
  /**
   * Converts the provided route configuration object into a Map for easy lookup.
   * The keys are action names, and the values are route configurations (handler functions and options).
   */
  const routeMap = new Map<string, RouteConfig>();

  for (const [action, config] of Object.entries(routes)) {
    routeMap.set(action, config);
  }

  return routeMap;
}
