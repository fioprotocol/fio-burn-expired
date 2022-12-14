/**
 * Service to return unwraps on the FIO chain
 * Recommend run interval: every 30 minutes
 * Console logs: send to discord
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

const { server } = process.env;

const baseUrl = server + '/v1/'
const fiourl = baseUrl + "chain/";

function toDateTime(secs) {
  var t = new Date(1970, 0, 1); // Epoch
  t.setSeconds(secs);
  //fdate = t.toLocaleDateString('en-US');
  return t.toLocaleDateString('en-US');
}

const getUnwraps = async () => {
  let unwrap, currentUnwrap, wrapDate;
  let offset = 0;
  let limit = 100;

  const threshold = 1000000000000;   // Sends warning for unwraps > 1000 FIO
  const checkInterval = 60*30;  // The interval, in seconds, that a check will be run. Set to 30 minutes.
  const billion = 1000000000;
  const curdate = new Date();
  const utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
  const unwraps = [];

  const unwrapQuery = await fetch(fiourl + 'get_table_rows', {
    body: `{
      "json": true,
      "code": "fio.oracle",
      "scope": "fio.oracle",
      "table": "oravotes",
      "limit": ${limit},
      "lower_bound": "${offset}",
      "reverse": true,
      "show_payer": false
    }`,
    method: 'POST',
  });

  const unwrapEvents = await unwrapQuery.json();

  if (unwrapEvents.rows.length > 0) {  
    // Step through each unwrap transaction
    for (unwrap in unwrapEvents.rows) {
      currentUnwrap = unwrapEvents.rows[unwrap].name
      if (unwrapEvents.rows[unwrap].timestamp > utcSeconds - checkInterval && unwrapEvents.rows[unwrap].amount > 0 ) {
        let notice = "Unwrap"
        wrapDate = toDateTime(unwrapEvents.rows[unwrap].timestamp);
        if ( unwrapEvents.rows[unwrap].amount > threshold ) { notice = "WARNING LARGE UNWRAP" }
        unwraps.push([notice, unwrapEvents.rows[unwrap].fio_address, unwrapEvents.rows[unwrap].amount, wrapDate]);
      };
    }; 
  };
    
  // Output to conole
  unwraps.forEach(element => {
    console.log(`${element[0]}: ${element[1]} unwrapped ${element[2] / billion} FIO on ${element[3]}`);
  });

}

getUnwraps();