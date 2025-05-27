import Knex, {Knex as KnexInstance} from 'knex';
import config from './knexfile';
//const config = require('../knexfile');

const connection: KnexInstance = Knex(
  config[process.env.NODE_ENV || 'development']
);

export default connection;
