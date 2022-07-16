# Why

# Instructions

## Local Setup

There are separate repos for the wiki content (editable via TiddlyDesktop) and
TiddlyBase code. Here's how to initialize both:

```bash
# clone repos
cd ~/git
git clone git@github.com:neumark/tw5-family-wiki.git csaladi_naplo
git clone git@github.com:neumark/tiddlybase.git
# init submodule
cd ~/git/csaladi_naplo
git submodule init
# create symlink to syncthing (src dir may vary)
ln -s /Users/neumark/Sync/csaladi_naplo_files files
~/git/tiddlybase

# init packages
cd ~/git/tiddlybase
# install NVM first if necessary
nvm install
# install yarn first if necessary
yarn
# build tiddlybase
yarn build
```

## Production setup

### GCP and firebase login
Login to gcloud and firebase - both are necessary, but you only have to do this once.

```bash
gcloud auth login
yarn firebase login
```

### GCP permissions

Firebase takes care of most of the behind-the-scenes GCP permission stuff, but I ran into some issues:

#### HTTP Cloud Functions
In Cloud Functions, each http cloud function used by tiddlybase must have the `Cloud Functions Invoker` role assigned to principal `allUsers`.
Interestingly, I only had to set this for the first function, subsequent functions worked after first deploy automatically.
Note: this means whether or not the user is authenticated needs to be checked _within the cloud function_.

#### Auth cloud functions
Cloud functions triggered on user signup or deletion will not be able to access firebase admin functions by default. The error message is:

```
Error: Credential implementation provided to initializeApp() via the "credential" property has insufficient permission to access the requested resource. See https://firebase.google.com/docs/admin/setup for details on how to authenticate this SDK with appropriate permissions.
```

This can be fixed by going to the IAM settings in GCP and manually adding the `Firebase Admin SDK Administrator Service Agent` and `Service Account Token Creator` roles to the app engine service account for the firebase project (in my case it was `peterneumark-com@appspot.gserviceaccount.com`).

## Deployment

Deploy uses `gsutil` and a couple of other binaries like `jq`.

```bash
yarn deploy
```

## Local development

To run tiddlybase locally, build first, then

```bash
yarn start
open http://localhost:8080/?local_wiki=true
```

Optionally, to start the firebase functions emulator, in another terminal window run:
```bash
yarn run start:functions
```

## Invitations and sending emails
SMTP credentials and the invitations whitelist is stored as firebase functions config.
Assuming `whitelist.json` is an array of strings (`["address1@gmail.com", "address2@whaterver.com"]`)
and `$SMTP_USER` and `$SMTP_PASS` are set, run the following to initialize:

```bash
yarn run firebase functions:config:set smtp.user="$SMTP_USER"
yarn run firebase functions:config:set smtp.password="$SMTP_PASS"
yarn run firebase functions:config:set signup.whitelist="$(cat whitelist.json | jq . -c)"
```

To add someone's address to the whitelist, do:

```bash
yarn run firebase functions:config:get | jq '.signup.whitelist | fromjson | sort' > whitelist.json
# edit whitelist.json
yarn run firebase functions:config:set signup.whitelist="$(cat whitelist.json | jq . -c)"
```

## Running the CLI

The cli needs the service account credentials json which can be downloaded from the firebase admin panel's 'Project Settings' page 'Service Accounts' tab. This is all hidden behind the cog icon next to the project name towards the top left corner of the screen. In the example below, I saved this file as `~/secrets/service-account-key.json`

```bash
# Check the custom token claims of a particular user based on their email address
GOOGLE_APPLICATION_CREDENTIALS=~/secrets/service-account-key.json yarn workspace @tiddlybase/cli cli getclaims neumark.peter@gmail.com
```
