/**
 * Service to  burn nfts that have been removed by a user
 * Recommend run interval: weekly
 * Console logs: send to discord
 */

import { FIOSDK } from '@fioprotocol/fiosdk';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { server, privateKey, publicKey } = process.env;

const baseUrl = server + '/v1/'
const fiourl = baseUrl + "chain/";

const fetchJson = async (uri, opts = {}) => {
  return fetch(uri, opts)
}

async function timeout(ms) {
  await new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const burnExpired = async () => {

  const user = new FIOSDK(
    privateKey,
    publicKey,
    baseUrl,
    fetchJson
  )

  const retryLimit = 1; // Number of times to call burnexpired with the same offset/limit when hitting a CPU limit error

  let domain, currentDomainName;
  let offset = 1;
  let limit = 1000;
  let retryCount = 0;
  let empty = false;
  let burned = false;
  let workDoneThisRound = true;
  let workDoneThisOffset = false;
  let burnLowerBound;
  let newOffset;
  let isWork = false;
  const burnLimit = 1;

  const curdate = new Date();
  const ninetyDaysInSecs = 90*24*60*60;
  const utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
  const utcMinus90Days = utcSeconds - ninetyDaysInSecs;

  while (!empty) {

    const domainQuery = await fetch(fiourl + 'get_table_rows', {
      body: `{
        "json": true,
        "code": "fio.address",
        "scope": "fio.address",
        "table": "domains",
        "limit": ${limit},
        "lower_bound": "${offset}",
        "reverse": false,
        "show_payer": false
      }`,
      method: 'POST',
    });

    const domains = await domainQuery.json()

    if (domains.rows.length == 0) {
        empty = true;
        break;
    } else {   
      // Step through each expired domain
      for (domain in domains.rows) {
        currentDomainName = domains.rows[domain].name
        if (domains.rows[domain].expiration < utcMinus90Days) {
          burnLowerBound = domains.rows[domain].id; 
          burned = false;

          while (!burned) {
            try {
              const result = await user.genericAction('pushTransaction', {
                action: 'burnexpired',
                account: 'fio.address',
                data: {
                  actor: user.account,
                  offset: burnLowerBound,
                  limit: burnLimit
                }
              })
              console.log(`Domain = ${currentDomainName}, Offset = ${burnLowerBound}, Limit = ${burnLimit}, Result: {status: ${result.status}, items_burned: ${result.items_burned}}`);
              isWork = true;
              workDoneThisOffset = true;
              workDoneThisRound = true;
              retryCount = 0;
              await timeout(1000); // To avoid duplicate transaction
            } catch (err) {
              workDoneThisOffset = false;              
              if (err.errorCode == 400 && err.json.fields[0].error == 'No work.') {
                console.log('No Work ')
                burned = true; // If no work done, exit out of this domain
                break;
              } else if (err.json.code == 500 && err.json.error.what == 'Transaction exceeded the current CPU usage limit imposed on the transaction' || err.json.error.what == 'Transaction took too long') {
                console.log(`Error: Domain = ${currentDomainName}, Offset = ${burnLowerBound}, Limit = ${burnLimit}, Result: Transaction took too long`);
                retryCount++;
              } else {
                console.log('UNEXPECTED ERROR: ', err);
                retryCount++;
              }

            }

            const pushResult = await fetch(fiourl + 'get_table_rows', {
              body: `{
              "json": true,
              "code": "fio.address",
              "scope": "fio.address",
              "table": "domains",
              "limit": "1",
              "lower_bound": "${burnLowerBound}",
              "reverse": false,
              "show_payer": false
            }`,
              method: 'POST',
            });

            const result = await pushResult.json()
            
            if (result.rows.length == 0) {
              console.log("DONE\n");
              // If this is the first round, or work was done during the round, reset 
              if (workDoneThisRound) {
                workDoneThisRound = false;
              } else {
                burned = true;  // No work was done this round and we are at the end of the domains
              }
            } else if (result.rows[0].name != currentDomainName) {
              console.log("DONE: (different domain found)\n");
              burned = true;  // Domain is fully burned
            } else {
              // If no work done and too many retries, move on to next domain
              if (!workDoneThisOffset && retryCount >= retryLimit) {
                  retryCount = 0;
                  burned = true;  // Move on to next domain
              }
            }
          };
        };
      };

      if (domain == domains.rows.length - 1) {
        newOffset = domains.rows[domain].id + 1; // Start the next iteration at the next record
      }
    };

    offset = newOffset;

  };  // while !empty
  
  if (!isWork) {console.log('No Domains burned this period')}
}

burnExpired();