const Flickr = require('flickr-sdk');
const fs = require('fs');
const Axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const flickr = new Flickr(process.env.FLICKR_KEY,  {});

getAllPhotos().catch(console.error);

async function getAllPhotos() {
    console.info('Getting pages...');

    let firstPageRes = await flickr.people.getPhotos({ user_id: process.env.FLICKR_USER_ID, per_page: 500 });
    let totalPages = firstPageRes.body.photos.pages;

    let allPhotos = [ ...firstPageRes.body.photos.photo ];

    for(let i = 2; i <= totalPages; i++) {
        let pageRes = await flickr.people.getPhotos({user_id: 'spacex', per_page: 500, page: i});
        allPhotos.push(...pageRes.body.photos.photo);
    }

    console.info('Downloading photos...')
    for(let i = 0; i < allPhotos.length; i++) {
        let path = process.env.DOWNLOAD_DIR + '/' + allPhotos[i].id + '.jpg';
        if(fs.existsSync(path)) {
            console.log('Have, skip', path, i+1, 'of', allPhotos.length);
        } else {
            let original = await getPhotoOriginalUrl(allPhotos[i].id);
            if (original) {
                await downloadImage(original, path);
                console.log('Downloaded', path, i + 1, 'of', allPhotos.length);
            }
        }
    }
}

async function getPhotoOriginalUrl(photo_id) {
    let res = await flickr.photos.getSizes({ photo_id });
    return res.body.sizes.size.filter(x => x.label === 'Original')[0]?.source;
}

async function downloadImage(url, filepath) {
    const response = await Axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    return new Promise((resolve, reject) => {
        response.data.pipe(fs.createWriteStream(filepath))
            .on('error', reject)
            .once('close', () => resolve(filepath));
    });
}
