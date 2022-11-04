
import * as dotenv from 'dotenv' // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import Mastodon from 'mastodon-api'; // Mastodon API wrapper
import fetch from 'node-fetch';
import fs from 'fs';
import sharp from 'sharp';

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
const rijks_qs = { 
    'imgonly': 'true',
    'format': 'json',
    'key': process.env.RIJKS_KEY
};
const params = new URLSearchParams(rijks_qs).toString();
const url = `${rijks_url}?${params}`;
 
// First request - get all data
const response = await fetch(url);
const data = await response.json();

const keys = data.facets.map(obj => { 
    var rObj = {};
    rObj.query = obj.name;
    rObj.values = obj.facets;
    return rObj;
});

// Randomly select datapoints from first request to make a request for a random piece of art
const randomKey = keys[Math.floor(Math.random()* keys.length)];
const randomValue = randomKey.values[Math.floor(Math.random()* randomKey.values.length)]
let expanded_qs = {...rijks_qs};
expanded_qs[randomKey.query] = randomValue.key;
expanded_qs['ps'] = randomValue.value
const updated_params = new URLSearchParams(expanded_qs).toString();
const url2 = `${rijks_url}?${updated_params}`;

const response2 = await fetch(url2);
const data2 = await response2.json();

// Here there be art
let randomArtPiece = data2.artObjects[Math.floor(Math.random()* data2.artObjects.length)];

const descResponse = await fetch(`${randomArtPiece.links.self}?${params}`);
const description = await descResponse.json();

const res = await fetch(randomArtPiece.webImage.url);
const resBuffer = await res.buffer();
await ShrinkSize(resBuffer, randomArtPiece.webImage.width, randomArtPiece.webImage.height);


// Todo: generate text for status in a seperate function and check char limit (500chars). 

// Post to Mastodon
M.post('media', { file: fs.createReadStream('images/output.jpg') }).then(resp => {
    const id = resp.data.id;
    M.post('statuses', { 
        status: 
        `${description.artObject.plaqueDescriptionEnglish || ''}\n
        ${description.artObject.title}, ${description.artObject.scLabelLine}.\n
        Source: ${randomArtPiece.links.web}`, media_ids: [id] },
    function(err, data){
        if(err){
            console.error(err)
        }else {
            console.log(`Success, id: ${data.id} was posted at ${data.url}`);
            console.log('Amsterart Bot is shutting down')
            console.log('---- ^-^ ----')
        }
    })
  });

  function ShrinkSize(path, width, height) {
    const resizeOptions = width > height ? { width : 650} : { height: 650}; // Biggest dimension should be 650
    const image = sharp(path).resize(resizeOptions)
    .toFile('images/output.jpg')
    return image;
  }