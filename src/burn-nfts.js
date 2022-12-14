/**
 * Service to  burn nfts that have been removed by a user
 * Recommend run interval: every 10 minutes
 * Console logs: server only. Do not send to discord
 */

import { FIOSDK } from '@fioprotocol/fiosdk';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const fetchJson = async (uri, opts = {}) => {
  return fetch(uri, opts)
}

const { server, privateKey, publicKey, account } = process.env;

const baseUrl = server + '/v1/'

function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

const burnnfts = async () => {

  const user = new FIOSDK(
    privateKey,
    publicKey,
    baseUrl,
    fetchJson
  )

  try {
    let done = false;
    while (!done) {
      const result = await user.genericAction('pushTransaction', {
        action: 'burnnfts',
        account: 'fio.address',
        data: {
          actor: account
        }
      })
      console.log('Result: ', result);
      if (result.status != 'OK') {done = true;}
      await delay(1000);
    }
    
  } catch (err) {
    if (err.json.fields[0]) {
      console.log(`burn-nfts: ${err.json.fields[0].error}`);
    } else {
      console.log('ERROR: ', err);
    }
    
  }
}

burnnfts();