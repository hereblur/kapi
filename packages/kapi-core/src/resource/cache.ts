import { ICacheAdaptor } from "../types/cache";
import { TypeID } from "../types/common";
import { QueryListParam } from "../types/crud";
import NoCache from "./nocache";



function consistentStringifyDeep<T>(obj: Record<string, any>): string {
    if (typeof obj !== "object" || obj === null) return JSON.stringify(obj);
  
    if (Array.isArray(obj)) {
      return JSON.stringify(obj.map(consistentStringifyDeep));
    }
  
    const sortedObj = Object.keys(obj)
      .sort()
      .reduce((acc, key) => {
        const typedKey = key as keyof Record<string, any>;
        acc[typedKey] = consistentStringifyDeep(obj[typedKey]);
        return acc;
      }, {} as Record<string, any>);
  
    return JSON.stringify(sortedObj);
  }

export default class CacheManager {
    cache: ICacheAdaptor = NoCache
    itemAgeSeconds = -1
    listAgeSeconds = -1

    constructor(cache: ICacheAdaptor) {
        this.cache = cache
    }

    async fetch<T>(key: string, ageSeconds: number, fn: () => Promise<T|null>): Promise<T|null> {
        const data = this.cache.get(key)
        if (data) {
            return data as T;
        }

        const data_ = await fn()
        if (data_) {
            this.cache.put(key, data_, ageSeconds)
        }
        return data_
    }

    async get<T>(resourceName: string, id: TypeID, fn: () => Promise<T|null>): Promise<T|null> {
        if (this.itemAgeSeconds < 0) {
            return await fn()
        }
        return await this.fetch<T>(`${resourceName}:get:${id}`, this.itemAgeSeconds, fn)
    }

    async list<T>(resourceName: string, query: QueryListParam, fn: () => Promise<T|null>): Promise<T|null> {
        if (this.listAgeSeconds < 0) {
            return await fn()
        }
        return await this.fetch<T>(`${resourceName}:list:${consistentStringifyDeep(query)}`, this.listAgeSeconds, fn)
    }

    async invalidate(resourceName: string, id: TypeID|null) {
        if (id) {
            await this.cache.delete(`${resourceName}:get:${id}`)
        }
        await this.cache.delete(`${resourceName}:list:*`)
    }
}