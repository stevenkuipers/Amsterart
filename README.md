# Amsterart Bot

Find this bot at the awesome [botsin.space](https://botsin.space/@amsterdart) instance.

Amsterart Bot is a Node.js application that fetches random artwork from the Rijksmuseum API and posts it to a Mastodon server (https://botsin.space) with a translated description. It leverages various libraries such as masto, node-fetch, sharp, and bing-translate-api to perform its tasks.

## Features
- Fetches random artwork from the Rijksmuseum API
- Resizes images to optimize them for posting
- Translates artwork information using the Bing Translate API
- Posts the artwork and its details to a Mastodon instance

## Prerequisites

- Node.js >= 18 installed on your machine (If lower you'll get issues with the image upload)
- A Mastodon account with an access token
- An API key for Rijksmuseum

## Setup

Clone the repository to your local machine.

Install the required dependencies by running npm install.

Create a `.env file` in the project root directory with the following variables:
```
RIJKS_KEY=<your_rijksmuseum_api_key>
ACCESS_TOKEN=<your_mastodon_access_token>
```

Run the bot by executing node index.js.

## How it works

The bot performs the following steps:

Fetches random artwork from the Rijksmuseum API, considering the filters for type, material, and technique.
Downloads the artwork image and resizes it using the sharp library.
Translates the artwork title and description using the Bing Translate API (Sometimes only a dutch description is available, this provides consistency).
Posts the artwork image along with its translated information to the specified Mastodon instance.
Works that are on display often have longer plaque descriptions, these are posted as a reply to the original post.
Logs the URL of the posted artwork to the console.