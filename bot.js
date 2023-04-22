import * as dotenv from 'dotenv';
import { login } from 'masto';
import fetch from 'node-fetch';
import fs from 'fs';
import sharp from 'sharp';
import { translate } from 'bing-translate-api';

dotenv.config();

console.log('Amsterart Bot is running');
console.log('---- ^-^ ----');

const rijks_url = 'https://www.rijksmuseum.nl/api/en/collection/';
const params = new URLSearchParams({
  'imgonly': 'true',
  'format': 'json',
  'permitDownload': 'true',
  'key': process.env.RIJKS_KEY,
});

async function main() {
  try {
    const keys = await fetchKeys(params);
    const { query, values } = keys[rndIndex(keys)];
    const { key, value } = values[rndIndex(values)];

    params.append(query, key);
    params.append('ps', value);

    const { links, webImage } = await fetchArtObject(params);
    const { title, scLabelLine, plaqueDescriptionEnglish } = await fetchArtObjectDetails(links.self, params);
    const resBuffer = await fetchImage(webImage.url);

    await shrinkSize(resBuffer, webImage.width, webImage.height);

    let theStatus = `${title}\n${scLabelLine}.`;

    try {
      const res = await translate(theStatus, null, 'en');
      theStatus = res.translation;
    } catch (err) {
      console.error(err);
    }

    await postToMasto(links.web, webImage.url, theStatus, title, plaqueDescriptionEnglish);
  } catch (error) {
    console.error('Error:', error);
  }
}

async function fetchKeys(params) {
  try {
    const response = await fetch(`${rijks_url}?${params.toString()}`);
    const { facets } = await response.json();
    return facets.map(({ name, facets }) => ({ 'query': name, 'values': facets }));
  } catch (error) {
    console.error('Error fetching keys:', error);
    throw error;
  }
}

async function fetchArtObject(params) {
  try {
    const response = await fetch(`${rijks_url}?${params.toString()}`);
    const { artObjects } = await response.json();
    return artObjects[rndIndex(artObjects)];
  } catch (error) {
    console.error('Error fetching art object:', error);
    throw error;
  }
}

async function fetchArtObjectDetails(url, params) {
  try {
    const response = await fetch(`${url}?${params}`);
    const { artObject } = await response.json();
    return artObject;
  } catch (error) {
    console.error('Error fetching art object details:', error);
    throw error;
  }
}

async function fetchImage(url) {
  try {
    const response = await fetch(url);
    return await response.buffer();
  } catch (error) {
    console.error('Error fetching image:', error);
    throw error;
  }
}

async function postToMasto(webLink, remoteUrl, theStatus, title, plaqueDescriptionEnglish) {
  try {
    const masto = await login({
      url: 'https://botsin.space',
      accessToken: process.env.ACCESS_TOKEN,
    });

    const attachment = await masto.v2.mediaAttachments.create({
      file: new Blob([fs.readFileSync('images/output.jpg')]),
      description: `${title}`,
      remote_url: `${remoteUrl}`,
    });

    const status = await masto.v1.statuses.create    ({
      'status': `${theStatus}\n\nSource: ${webLink}`,
      visibility: 'public',
      mediaIds: [attachment.id],
    });

    if (plaqueDescriptionEnglish) {
      const reply = await masto.v1.statuses.create({
        'status': `${plaqueDescriptionEnglish.slice(0, 500)}`,
        'in_reply_to_id': status.id,
        visibility: 'public',
      });

      console.log('Success:', status.url, reply.url);
    } else {
      console.log('Success:', status.url);
    }
  } catch (error) {
    console.error('Error posting to Mastodon:', error);
    throw error;
  }
}

function shrinkSize(path, width, height) {
  const resizeOptions = width > height ? { width: 650 } : { height: 650 }; // Biggest dimension should be 650
  const image = sharp(path).resize(resizeOptions).toFile('images/output.jpg');
  return image;
}

function rndIndex(arr) {
  return Math.floor(Math.random() * arr.length);
}

// Run the main function
main();
