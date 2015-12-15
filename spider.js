"use strict"
const request = require('request'),
  mongoose = require('mongoose'),
  cheerio = require('cheerio'),
  Url = require('url'),
  Site = require('./models/Site'),
  async = require('async')

mongoose.connect('mongodb://localhost/startup-search-engine')

async.whilst(function(){return true}, function(next){
  spider().catch( function(err){
    console.log(err)
    next()
  }).then(function(res){
    console.log('finished', res)
    next()
  }, function(err){
    console.log(err)
    next()
  })
})


function spider(){
  return new Promise( (resolve, reject) => {
    Site.findOne({blacklist: false}).sort({updated_at: 1}).exec( function(err, site){
      if(site){
        site.updated_at = Date.now()
        site.save()

        let paths_hit = []
        async.eachSeries( site.paths, function(path, nextPath){
          if(path.content.links.length > 0){
            async.eachSeries(path.content.links, function(link, nextLink){
              if(paths_hit.some( hit => hit == link)) return nextLink()
              paths_hit.push(link)

              //create url to hit
              //check if link starts with http
              let hit_url
              if(link.indexOf('http') >= 0){
                //hit the url
                hit_url = link
              }else{
                //create url and then hit
                hit_url = `http://${site.domain}${link}`
              }

              capture(hit_url).then(function(res){
                nextLink()
              }, function(err){
                if(err) console.log('error hitting', hit_url, err)
                nextLink()
              })

            },function done(){
              nextPath()
            })
          }else{
            resolve(capture(`http://${site.domain}`))
          }

        }, function done(res){
          resolve(res)
        })
      }else{
        resolve(capture('http://www.startuptabs.com/'))
      }
    })
  })
}

var blacklist = false
//capture('http://startuptabs.slack.com/ssb/download-osx')
function capture(url){
  console.log('capturing', url)
  return new Promise( (resolve, reject) => {
    let parsed = Url.parse(url)
    let domain = parsed.host,
      path = parsed.path

    async.waterfall([
      function(done){
        //check blacklist
        if(blacklist){
          let blacklisted = blacklist.some( site => site.domain == domain )
          if(blacklisted){
            done('blacklisted')
          }else{
            done()
          }
        }else{
          Site.find({blacklist: true}, function(err, black){
            blacklist = black
            let blacklisted = black.some( site => site.domain == domain )
            if(blacklisted){
              done('blacklisted')
            }else{
              done()
            }
          })
        }
      },
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
        let path_exists = site.paths.some( path => path.path == parsed.path )
        if(path_exists){
          site.updated_at = Date.now()
          site.save()
          return done()
        }
        request(url, {timeout: 5000}, function(err, response, body){
          if(err || response.statusCode != 200) return done(err)

          let $ = cheerio.load(body)

          let links = $('a'),
            headers = $('h1, h2, h3, h4, h5, h6'),
            paragraphs = $('p')

          let entry = {
            path: path,
            title: $('title').text(),
            description: $('meta[name=description]').attr('content'),
            content: {
              links: links.map( (index, link) => $(link).attr('href') ).get(),
              headers: headers.map( (index, header) => $(header).text() ).get(),
              paragraphs: paragraphs.map( (index, paragraph) => $(paragraph).text() ).get()
            }
          }

          site.paths.addToSet(entry)

          site.save( function(err, saved){
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
