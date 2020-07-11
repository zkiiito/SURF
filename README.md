
# SURF

[ ![Codeship Status for zkiiito/SURF](https://codeship.com/projects/bf1d3c00-5988-0132-2ac1-123ab8314f17/status)](https://codeship.com/projects/50287)

SURF is a threaded instant messaging application, like Google Wave used to be.

Try it at <http://surfchat.herokuapp.com> - website at <http://zkiiito.github.io/SURF>.

## Features / usage
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
* start a private conversation with a friend by double-clicking their avatar


## Installation
### Requirements

* [node.js]
* [mongodb]
* [redis]

### Steps for you local (development) copy
```sh
$ git clone git@github.com:zkiiito/SURF.git surf
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

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/zkiiito/surf)

Nice-to-have Heroku addons, not installed by default:
* Hosted Graphite - for monitoring query times
* Nodetime - performance analysis

## Development

You want to develop? Cool!

##### Concat and/or minify client-side js every time it changes:
* setup your IDE to run "grunt concat" every time files change in the client/js or admin/js folder, excluding surf.min.js and admin.min.js
* the pre-commit package will take care of uglifying when committing

##### Test
Install [casperjs], start the server and
```
$ npm test
```
should do the rest!

## Creators

**Csaba Schreiner** design, sitebuild
* <https://www.behance.net/csaba-schreiner>

**Zoltan Feher** code
- <http://github.com/zkiiito>

## License

All code released under the [GNU GPL v3.0](LICENSE).

[node.js]:http://nodejs.org
[mongodb]:http://www.mongodb.org
[redis]:http://redis.io
[casperjs]: http://casperjs.org/
[Heroku]:https://www.heroku.com/
