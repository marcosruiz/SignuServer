# SignuServer

Server to manage PDFs and users of Signu mobile app

## Status

[![Build Status](https://travis-ci.com/marcosruiz/SignuServer.svg?branch=master)](https://travis-ci.com/marcosruiz/SignuServer)

[![codecov](https://codecov.io/gh/marcosruiz/SignuServer/branch/master/graph/badge.svg)](https://codecov.io/gh/marcosruiz/SignuServer)


## How to install

- Download the source code to your workspace
- Install "npm" in your computer
- Install all npm libraries with "npm install" or "npm update"
- Install "mongodb" in your computer (v 3.6.4 recommended)
- Add MONGO_PATH as a Enviroment Variable
- Add %MONGO_HOME%/bin to your path (if you are in Windows)
- Start "mongod" in a prompt
- Add enviroment variables such as
    - EMAIL_SECRET
    - PASS_SECRET
    - TOKEN_SECRET
- If you want to let your google account send mails, go there and put ON the less secure options or use an application password: https://myaccount.google.com/lesssecureapps?pli=1
- Copy in sslcert/ server.crt and server.key (you can use sslcert and command lines to do that). This is necessary to use the protocol HTTPS
- Run test/pdfTest.js and test/userTest.js to check everything is OK
- Run bin/www to start the server on port 3000 (HTTP) and 8000 (HTTPS)
- Voila!

## API

You can check our API in http://signu-server.herokuapp.com/api-docs

## TravisCI

If you want to use travisCI in this repository you will need:

- Ruby: https://rubyinstaller.org/downloads/
- Gem: https://rubygems.org/pages/download
- run "gem install travis"

## Problems and solutions

If file .gitignore don't update files (un)ignored write this on root directory on Intellij

```
git rm -r --cached .
git add .
git commit -m "fixed untracked files"
```


