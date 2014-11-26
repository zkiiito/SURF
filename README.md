[ ![Codeship Status for zkiiito/surf](https://codeship.com/projects/ee955f70-9cc7-0131-fc5a-3e1ab7f2c066/status)](https://codeship.com/projects/17834)

# SURF

SURF is a threaded instant messaging application, like Google Wave used to be.

### Features / usage
* create new conversation
* add friends from the *Edit* menu
 * if they share a conversation with you, the autosuggested *Participants* field can find them
 * if not, get and invite code and send them! (different code for everyone)
* add a message
 * using the textfield at the bottom of the conversation
 * reply to another message
   * using the *→* button, or
   * by double clicking the message
 * mention your friend by typing *@friendName* and pressing Tab button
* jump to the next unread message
 * by pressing spacebar
 * clicking the *Next unread* button
 * clicking on the current conversation on the left side
* start a private conversation with a friend by double-clicking his avatar


## Installation
### Requirements

* [node.js]
* [mongodb]
* [redis]

### Steps for you local (development) copy
```sh
$ git clone [git-repo-url] surf
$ cd surf
$ export TESTMODE=1
$ npm install
$ npm install -g grunt-cli
$ node Surf.js
```
After this, your server is running on http://localhost:8000/ with google authtentication, http://localhost:8000/loginTest with no authentication, and http://localhost:8000/admin for administration (default login with admin/adminPass).

If you need facebook auth, edit the config file /code/Config.js with your facebook appId and appSecret, and http://localhost:8000/auth/facebook will be your friend.

### Deployment to Heroku

Surf was designed to run on [Heroku], and there are some additional things you should do before deployment
* Create a google project for your Heroku domain, described [here](https://developers.google.com/accounts/docs/OpenIDConnect).
* Create a google tracking code at the [analytics site](https://developers.google.com/analytics/devguides/collection/analyticsjs/).
* Optional: create a [facebook app](https://developers.facebook.com/) for your Heroku domain.

```
heroku config:set GOOGLE_APPID=(yourGoogleAppId) GOOGLE_APPSECRET=(yourGooleAppSecret) ANALYTICS_ID=(analitycsWebPropertyId) HOSTNAME=(https://yourapp.heroku.com) ADMINPASS=(yourSecretAdminPassword) FACEBOOK_APPID=(yourFbAppId) FACEBOOK_APPSECRET=(yourFbAppSecret)
```

Required Heroku addons:
* mongodb (we recommend MongoLab)
* redis (we recommend Redis Cloud)

Nice-to-have Heroku addons:
* PaperTrail - for logs & alerting
* Hosted Graphite - for monitoring query times
* Nodetime - performance analysis

## Development

You want to develop? Cool!

##### Concat and/or minify client-side js every time it changes:
* setup your IDE to run "grunt concat" every time files change in the client/js or admin/js folder, excluding surf.min.js and admin.min.js
* copy hooks/pre-commit to your .git/hooks directory

##### Test
install [casperjs], start the server and
```
$ npm test
```
should do the rest!

## License

GPLv3

[node.js]:http://nodejs.org
[mongodb]:http://www.mongodb.org
[redis]:http://redis.io
[casperjs]: http://casperjs.org/
[Heroku]:https://www.heroku.com/
