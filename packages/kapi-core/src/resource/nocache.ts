import { ICacheAdaptor } from "../types/cache";

const NoCache: ICacheAdaptor = {
    get: () => Promise.resolve(null),
    put: () => Promise.resolve(),
    delete: () => Promise.resolve(),
}
       

export default NoCache;