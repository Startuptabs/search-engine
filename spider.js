"use strict"
const request = require('request'),
  mongoose = require('mongoose'),
  cheerio = require('cheerio'),
  Url = require('url'),
  Site = require('./models/Site'),
  async = require('async')

mongoose.connect('mongodb://localhost/startup-search-engine')



console.log('1')
spider('http://www.startuptabs.com').catch( function(err){
  console.log(err)
})

function spider(url){
  console.log('starting', url)
  return new Promise( (resolve, reject) => {
    let parsed = Url.parse(url)
    let domain = parsed.host,
      path = parsed.path

    async.waterfall([
      function(done){
        //check for domain entry
        Site.findOne({domain: domain}, (err, site) => {
          if(err) return done(err)

          if(!site){
            site = new Site({
              domain: domain
            });

            site.save( function(err, saved){
              done(err, saved)
            })
          }else{
            done(null, site)
          }
        })
      }, function(site, done){
        //check for path entry
        let path_exists = site.paths.some( path => path == Url(url).path )

        if(path_exists) return done()

        request(url, function(err, response, body){
          let $ = cheerio.load(body)

          let links = $('a'),
            headers = $('h1, h2, h3, h4, h5, h6'),
            paragraphs = $('p')

          let entry = {
            title: $('title').text(),
            description: $('meta[name=description]').attr('content'),
            content: {
              links: links.map( (index, link) => $(link).attr('href') ),
              headers: headers.map( (index, header) => $(header).text() ),
              paragraphs: paragraphs.map( (index, paragraph) => $(paragraph).text() )
            }
          }

          site.paths.addToSet(entry)
          site.save( function(err, saved){
            console.log('wtf',err);
            done(err)
          })
        })
      }
    ], function(err){
      if(err) return reject(err)
      resolve('done')
    })
  })
}
