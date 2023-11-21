import mongoose from 'mongoose';
import { config } from './config';
import Logger from 'bunyan';

const log: Logger = config.createLogger('setupDatabase');

const connect = async () => {
  try {
    await mongoose.connect(`${config.DATABASE_URL}`);
    log.info('Successfully connected to the database.');
  } catch (error) {
    log.error('Error connecting to the database:', error);
    process.exit(1);
  }
};

const setupDatabaseConnection = async () => {
  await connect();

  mongoose.connection.on('disconnected', async () => {
    console.log('Connection to the database lost. Reconnecting...');
    await connect();
  });
};

export default setupDatabaseConnection;
