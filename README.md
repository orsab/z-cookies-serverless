# Monster Cookie Generator chromium worker

*Discord bot for proxied cookie*

### Dependences
- AWS account for lambda running permissions

### Istallation
```bash
$ npm i -g serverless
$ cp .env.example .env
$ vi .env

PROXY6_TOKEN=           # proxy6.net API token

$ sls deploy
```

### How it works

1. Deploy the serverless app
2. Invoke cookie function from bot script
3. Await for cookies