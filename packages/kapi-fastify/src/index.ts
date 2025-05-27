import KapiFastify from './KapiFastify';
import useCors from './plugins/cors';
import useOpenAPI from './plugins/doc';
import useResources from './plugins/rest';

export default KapiFastify;

export {useCors};
export {useOpenAPI};
export {useResources};

export * from './types';
