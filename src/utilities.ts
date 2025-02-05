/* eslint-disable @typescript-eslint/no-explicit-any */
// utilities.ts

/**
 * Convert all keys of a dictionary (object) from camelCase to snake_case.
 * @param data - Object or array to convert.
 * @returns Converted object or array.
 */
export function camelToSnakeCase(data: any): any {
    if (Array.isArray(data)) {
      return data.map(camelToSnakeCase);
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        const snakeKey = key
          .replace(/ocppCSMSURL/g, 'ocpp_csms_url')
          .replace(/V2X|V2G/g, (match) => `_${match.toLowerCase()}`)
          .replace(/([a-z])([A-Z])/g, '$1_$2')
          .toLowerCase();
        acc[snakeKey] = camelToSnakeCase(data[key]);
        return acc;
      }, {} as Record<string, any>);
    }
    return data;
  }
  
  /**
   * Convert all keys of a dictionary (object) from snake_case to camelCase.
   * @param data - Object or array to convert.
   * @returns Converted object or array.
   */
  export function snakeToCamelCase(data: any): any {
    if (Array.isArray(data)) {
      return data.map(snakeToCamelCase);
    } else if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        const camelKey = key
          .replace(/ocpp_csms_url/g, 'ocppCsmsUrl')
          .replace(/(_v2x|_v2g)/g, (match) => match.toUpperCase().replace('_', ''))
          .replace(/(_[a-z])/g, (match) => match[1].toUpperCase());
        acc[camelKey] = snakeToCamelCase(data[key]);
        return acc;
      }, {} as Record<string, any>);
    }
    return data;
  }
  