/**
 * Returns all expired domains and the targeted burn date.
 * Recommend run interval: weekly
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

const getExpiredDomains = async () => {
  let domain, currentDomainName;
  let offset = 0;
  let limit = 800;
  let empty = false;
  let expireDate, burnDate;
  let newOffset;

  const curdate = new Date();
  const ninetyDaysInSecs = 90*24*60*60;
  const utcSeconds = (curdate.getTime() + curdate.getTimezoneOffset()*60*1000)/1000;  // Convert to UTC
  const expiredDomains = [];

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
        if (domains.rows[domain].expiration < utcSeconds) {
          expireDate = toDateTime(domains.rows[domain].expiration);
          burnDate = toDateTime(domains.rows[domain].expiration + ninetyDaysInSecs);
          expiredDomains.push([domains.rows[domain].expiration, currentDomainName, expireDate, burnDate])
        };
      }; 

      if (domain == domains.rows.length - 1) {
        newOffset = domains.rows[domain].id + 1; // Start the next iteration at the next record
      }
    };
    offset = newOffset;
  }; 

  expiredDomains.sort(function(a, b) {
    return a[0] - b[0];  // Sort on expire date in seconds
  });

  // Output to conole
  expiredDomains.forEach(element => {
    console.log(`${element[1]} expiration is ${element[2]} and will be burned on ${element[3]}`);
  });

}

getExpiredDomains();