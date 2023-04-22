
import * as dotenv from 'dotenv';
import { login } from 'masto';
import fetch from 'node-fetch';
import fs from 'fs';
import sharp from 'sharp';
import { translate } from 'bing-translate-api';

dotenv.config();

console.log('Amsterart Bot is running')
console.log('---- ^-^ ----')

const rijks_url = 'https://www.rijksmuseum.nl/api/en/collection/'
const params = new URLSearchParams( {'imgonly': 'true', 'format': 'json', 'key': process.env.RIJKS_KEY});
 
// First request - get all data
let response = await fetch(`${rijks_url}?${params.toString()}`);
const { facets } = await response.json();

// map all keys of the facets key
// {
//     query: 'technique',
//     values: [
//       { key: 'etching', value: 148071 },
//       { key: 'engraving', value: 107811 }
//     ]
// }, query: 'material',
// values: [ ...

const keys = facets.map( ({name, facets}) => ( {'query': name, 'values': facets} ) );
const {query, values} = keys[rndIndex(keys)]; // Randomly select a query and key from the first response to make a request for a random piece of art
const {key, value} = values[rndIndex(values)];

params.append(query, key);
params.append('ps', value);

response = await fetch(`${rijks_url}?${params.toString()}`);
const { artObjects } = await response.json();
const {links, webImage} = artObjects[rndIndex(artObjects)]; // Here there be art

// Get additional description for the piece
response = await fetch(`${links.self}?${params}`);
const { artObject } = await response.json();
const { title, scLabelLine, plaqueDescriptionEnglish } = artObject;

response = await fetch(webImage.url);
const resBuffer = await response.buffer();
await ShrinkSize(resBuffer, webImage.width, webImage.height);

let theStatus = `${title}\n${scLabelLine}.`;

try {
  const res = await translate(theStatus, null, 'en');
  theStatus = res.translation;
} catch (err) {
  console.error(err);
}

//Post to Mastodon

try {
  const masto = await login({
    url: 'https://botsin.space',
    accessToken: process.env.ACCESS_TOKEN,
  });
  
  const attachment = await masto.v2.mediaAttachments.create({
    file: new Blob([fs.readFileSync('images/output.jpg')]),
    description: `${title}`,
    remote_url: `${webImage.url}`
  });

  const status = await masto.v1.statuses.create({
    'status': `${theStatus}\n\nSource: ${links.web}`,
    visibility: 'public',
    mediaIds: [attachment.id],
  });

  if( plaqueDescriptionEnglish){
    const reply = await masto.v1.statuses.create({
      'status':  `${plaqueDescriptionEnglish.slice(0, 500)}`,
      'in_reply_to_id': status.id,
      visibility: 'public',
    });
  }

  console.log('Succes: ', status.url, plaqueDescriptionEnglish ? reply.url : '')
} catch (error) {
  console.error('Error: ', error);
  throw Error
}

//   Some helper functions

// resize image
  function ShrinkSize(path, width, height) {
    const resizeOptions = width > height ? { width : 650} : { height: 650}; // Biggest dimension should be 650
    const image = sharp(path).resize(resizeOptions)
    .toFile('images/output.jpg')
    return image;
  }
// return random index of array
  function rndIndex(arr){
    return Math.floor(Math.random()* arr.length)
  }