# SignuServer

Server to manage PDFs and users of Signu mobile app

## Info



## How to install

- Download the source code to your workspace
- Install "npm" in your computer
- Install all npm libraries with "npm install" or "npm update"
- Install "mongodb" in your computer (v 3.6.4 recommended)
- Add MONGO_PATH as a Enviroment Variable
- Add %MONGO_HOME%/bin to your path (if you are in Windows)
- Start "mongod" in a prompt
- Rename routes/restrictedArea/emailConfigExample.js to emailConfig.js and write a valid email
- If you want to let your google account send mails, go there and put ON the less secure options or use an application password: https://myaccount.google.com/lesssecureapps?pli=1
- Copy in sslcert/ server.crt and server.key (you can use sslcert and command lines to do that). This is necessary to use the protocol HTTPS
- Run test/pdfTest.js to check everything is OK
- Run test/userTest.js to check everything is OK
- Run bin/www to start the server on port 3000 (HTTP) and 8000 (HTTPS)
- Voila!

## API

You can check the api in route localhost:3000/api-docs



