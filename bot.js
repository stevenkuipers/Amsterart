require('dotenv').config(); // ENV Node
const Mastodon = require('mastodon-api'); // Mastodon API wrapper
const request = require('request'); // HTTP request module
const sharp = require('sharp'); // Image proccesing
const fs = require('fs'); // File System

console.log('Amsterart Bot is running')

const M = new Mastodon({
    access_token : process.env.ACCESS_TOKEN,
    client_secret : process.env.CLIENT_SECRET,
    client_key : process.env.CLIENT_KEY,
    api_url: 'https://botsin.space/api/v1/'
})

// Get requests Rijksmuseum
// endpoint and basic querystring
const rijks_url = 'https://www.rijksmuseum.nl/api/en/collection/'
const rijks_qs = { 
    'imgonly': 'true',
    'format': 'json',
    'key': process.env.RIJKS_KEY
};

request({url: rijks_url, qs: rijks_qs}, function(err, response, data) {
  if(err) { 
      console.error(err); 
    }else {
        console.log("Get response: " + response.statusCode);
        // get query keys and corresponding values
        data = JSON.parse(data);
        const keys = data.facets.map(obj => { 
            var rObj = {};
            rObj.query = obj.name;
            rObj.values = obj.facets;
            return rObj;
        });

        // For search queries we use randomKey.query : randomValue.key , ps : randomValue.value
        // ps is number of available results.
        let randomKey = keys[Math.floor(Math.random()* keys.length)];
        let randomValue = randomKey.values[Math.floor(Math.random()* randomKey.values.length)]
        
        let expanded_qs = {...rijks_qs};
        expanded_qs[randomKey.query] = randomValue.key;
        expanded_qs['ps'] = randomValue.value
        request({url: rijks_url, qs: expanded_qs}, function(err, response, data) {
            if(err) { 
                console.error(err); 
              }else {
                data = JSON.parse(data);
                // get randomized art piece from results 
                let randomArtPiece = data.artObjects[Math.floor(Math.random()* data.artObjects.length)];           
                M.post('statuses', { status: randomArtPiece.title }, function(err, data){
                    if(err){
                        console.error(err)
                    }else {
                        console.log(`Success, id: ${data.id} was posted at ${data.url}`)
                    }
                })
            }
        })
    }
});


const create_image = function(url){
    // Download image locally    
    let image = fs.createWriteStream('original.jpg');
    let r = request(url).pipe(image);
    r.on('error', function(err) { console.log(err); });
    r.on('finish', function() { 
        image.close() 
        sharp('original.jpg')
        .resize(320, 240)
        .toFile('resized.jpg', (err, info) => {
            if(err) {
                console.error(err)
            }else{ 
                return 0
            }
         });
    });
}