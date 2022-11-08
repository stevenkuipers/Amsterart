
import * as dotenv from 'dotenv';
import Mastodon from 'mastodon-api';
import fetch from 'node-fetch';
import fs from 'fs';
import sharp from 'sharp';

dotenv.config();

console.log('Amsterart Bot is running')
console.log('---- ^-^ ----')

// Mastodon API wrapper
const M = new Mastodon({
    access_token : process.env.ACCESS_TOKEN,
    client_secret : process.env.CLIENT_SECRET,
    client_key : process.env.CLIENT_KEY,
    api_url: 'https://botsin.space/api/v1/'
})

const rijks_url = 'https://www.rijksmuseum.nl/api/en/collection/'
const params = new URLSearchParams( {'imgonly': 'true', 'format': 'json', 'key': process.env.RIJKS_KEY});
 
// First request - get all data
const response = await fetch(`${rijks_url}?${params.toString()}`);
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
const {key, value} = values[rndIndex(values)]

params.append(query, key)
params.append('ps', value)

const response2 = await fetch(`${rijks_url}?${params.toString()}`);
const { artObjects } = await response2.json();
const {links, webImage} = artObjects[rndIndex(artObjects)]; // Here there be art

// Get additional description for the piece
const descResponse = await fetch(`${links.self}?${params}`);
const { artObject } = await descResponse.json();
const { title, scLabelLine, plaqueDescriptionEnglish } = artObject;

const res = await fetch(webImage.url);
const resBuffer = await res.buffer();
await ShrinkSize(resBuffer, webImage.width, webImage.height);

// Todo: generate text for status in a seperate function and check char limit (500chars). 

// Post to Mastodon
M.post('media', { file: fs.createReadStream('images/output.jpg') }).then(resp => {
    const id = resp.data.id;
    M.post('statuses', { 
        status: `${title}, ${scLabelLine}.\nSource: ${links.web}`, 
        media_ids: [id] 
    },
    function(err, data){
        if(err){
            console.error(err)
        }else {
            console.log(`Success, id: ${data.id} was posted at ${data.url}`);
            console.log( `${plaqueDescriptionEnglish || ''}` );
            console.log('Amsterart Bot is shutting down')
            console.log('---- ^-^ ----')
        }
    })
  });


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