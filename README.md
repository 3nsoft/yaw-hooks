# YAW-hooks (Yet Another Web hooks)

Simplicity of adding single function with specific credentials. Simplicity is the goal.

## Build and pack

Run `prep-test-pack.sh` script in repository. It will bring all node modules, compile code, run test, and pack deb package with its own version of node.


## Configuration file

Configuration is located in one YAML in simple format.

Service configuration needs port and an optional ip address:
```yaml
port: 8080
address: 10.10.10.10
```

Key and certificate for TLS are required:
```yaml
tls:
  key: tests/tls/key.pem
  cert: tests/tls/cert.pem
```

Functions can be shell scripts/programs and JavaScript functions, served by ExpressJS server. Shell scripts are located starting with root directory, given by `runRoot`. JavaScript functions ale located starting with root directory, given by `scriptsRoot`.
```yaml
runRoot: folder/with/shell-progs
scriptsRoot: folder/with/js-funcs
```

Array of exposed webhooks is given by field `hook`. Every webhook is defined by single obj.
```yaml
hooks:

  - request:
      url: list
      type: GET
      accessToken:
        type: sha256
        value: jCCMMccXh4kJue2lV9GTE8_wE56RRRxvt_3IHUZdrPg=
    run:
      command: ls
      staticArgs: -l

  - request:
      url: echo
      type: POST
      body: binary
      accessToken:
        type: sha256
        value: 4Bcm8AOX-WpeACm78SAxNnEHZbSKO-2IYcOlFaKLpU0=
    script:
      file: echo.js
      func: echo
```

Webhook definition object must have `request` field with connection and authentication (note comments):
```yaml
  - request:
      # path part for http request url
		url: path/in/http/url
		# http method for request
		type: GET
		# access token contains type and value of creds that server side
		# uses to allow access to this particular request.
      accessToken:
        type: sha256
        value: jCCMMccXh4kJue2lV9GTE8_wE56RRRxvt_3IHUZdrPg=
```

To generate credentials, use script in repository:
```
$ node build/gen-access-token.js 
{
  secret: 'zWr6_J3Hlp5ZP2uiFRuc0un6FT2wZHFAhEjPh_u5pO0=',
  tokenCfg: {
    type: 'sha256',
    value: 'KIe6VPBr27lT2oRQQAlX3K57Lr2Nbvb-VLl8ZNqBnhI='
  }
}
```
exposed as `webhooks-generate-access-token` command from deb package.