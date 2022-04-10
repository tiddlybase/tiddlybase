
# Local development

http://localhost:8080/?local_wiki=true

# Setup

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
yarn build

# Login to gcloud and firebase
gcloud auth login
yarn firebase login

yarn deploy
```
